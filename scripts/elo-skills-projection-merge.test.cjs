const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function patchedResolveFilename(
  request,
  parent,
  isMain,
  options,
) {
  if (request.startsWith("@/")) {
    request = path.join(projectRoot, request.slice(2));
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(mod, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        allowJs: true,
      },
      fileName: filename,
    });

    mod._compile(outputText, filename);
  };
}

const {
  getVisibleEloMetricTabs,
  normalizeVisibleEloMetricTab,
  resolveVisibleEloInsight,
  resolveVisibleEloSection,
} = require("../utils/elo/visibleMetricTabs.ts");
const {
  buildLocalChartSetupPayload,
} = require("../lib/cloud/analytics/buildLocalChartSetupPayload.ts");
const {
  resolveEffectiveChartSetupPayload,
} = require("../lib/cloud/analytics/resolveChartSetupPayload.ts");
const {
  buildFallbackEloSection,
  buildFallbackEloInsight,
} = require("../utils/ratingTabFallbacks.ts");

const summary = {
  playerId: "focus-player",
  name: "Fochizzy",
  currentElo: 906,
  peakElo: 1000,
  confidence: 0.75,
  gamesPlayed: 12,
  wins: 7,
  losses: 5,
  avgDelta: 2.4,
  bestDelta: 18,
  worstDelta: -13,
  recentForm: "WWLW",
};

const players = [
  { id: "greg", name: "Greg", color: "blue" },
  { id: "corey", name: "Corey", color: "orange" },
  { id: "izzy", name: "Izzy", color: "purple" },
  { id: "rev", name: "RevLoki", color: "green" },
];

assert.deepEqual(
  getVisibleEloMetricTabs(),
  ["Leaderboard", "Momentum", "Skills", "Context"],
  "expected the shared ELO tab model to remove the standalone Projection tab after the merge",
);

assert.equal(
  normalizeVisibleEloMetricTab("Projection"),
  "Skills",
  "expected legacy Projection tab selections to fall through to Skills after the merge",
);

const mergedSection = resolveVisibleEloSection(
  {
    Skills: {
      title: "Skill Indicators",
      cards: [
        { key: "skill-score", label: "Skill Score", value: "68" },
        { key: "consistency", label: "Consistency", value: "74%" },
      ],
    },
    Projection: {
      title: "Projection Signals",
      cards: [
        { key: "projection-score", label: "Projection Score", value: "71" },
        { key: "future-peak", label: "Future Peak", value: "1034" },
      ],
    },
  },
  "Skills",
);

assert.deepEqual(
  mergedSection.cards.map((card) => card.label),
  ["Skill Score", "Consistency", "Projection Score", "Future Peak"],
  "expected the Skills section to keep its own cards and append the old Projection cards after the merge",
);

const mergedInsight = resolveVisibleEloInsight(
  {
    Skills: {
      title: "Skill Signal",
      body: "Fochizzy's strongest skill signal right now is consistency.",
    },
    Projection: {
      title: "Projection Read",
      body: "Future peak and promotion odds are still trending upward.",
    },
  },
  "Skills",
);

assert.equal(
  mergedInsight.title,
  "Skill Signal",
  "expected the Skills insight title to stay primary after absorbing the old Projection copy",
);
assert.match(
  mergedInsight.body,
  /strongest skill signal/i,
  "expected the merged Skills insight to retain the original skill explanation",
);
assert.match(
  mergedInsight.body,
  /Future peak and promotion odds/i,
  "expected the merged Skills insight to retain the old projection explanation",
);

const localPayload = buildLocalChartSetupPayload({
  chartKey: "elo",
  players,
  authProfileId: "greg",
  authSessionUserId: "greg",
  routeIds: [],
  routeEloTab: "Projection",
});

assert.deepEqual(
  localPayload.eloViewOptions.map((option) => option.key),
  ["Leaderboard", "Momentum", "Skills", "Context"],
  "expected local chart setup ELO view options to expose the merged tab list",
);

assert.equal(
  localPayload.defaults.eloTab,
  "Skills",
  "expected Projection deeplinks to normalize onto Skills in the local chart setup payload",
);

const effectivePayload = resolveEffectiveChartSetupPayload({
  chartKey: "elo",
  publishedPayload: {
    chartKey: "elo",
    generatedAt: "2026-05-29T00:00:00.000Z",
    focusPlayerOptions: players.map((player) => ({
      key: player.id,
      label: player.name,
    })),
    comparePlayerOptions: [],
    scopePlayerOptions: players.map((player) => ({
      key: player.id,
      label: player.name,
    })),
    metricOptions: [],
    lineModeOptions: [],
    eloViewOptions: [
      { key: "Leaderboard", label: "Leaderboard" },
      { key: "Momentum", label: "Momentum" },
      { key: "Skills", label: "Skills" },
      { key: "Context", label: "Context" },
      { key: "Projection", label: "Projection" },
    ],
    opponentOptions: players.map((player) => ({
      key: player.id,
      label: player.name,
    })),
    defaults: {
      focusPlayerId: "greg",
      comparePlayerId: null,
      scopedPlayerIds: ["greg", "corey", "izzy", "rev"],
      metricKey: null,
      lineMode: null,
      eloTab: "Projection",
      opponentId: "corey",
    },
    emptyState: null,
  },
  fallbackPayload: localPayload,
});

assert.deepEqual(
  effectivePayload.eloViewOptions.map((option) => option.key),
  ["Leaderboard", "Momentum", "Skills", "Context"],
  "expected the effective chart setup payload to scrub the legacy Projection option from published data",
);

assert.equal(
  effectivePayload.defaults.eloTab,
  "Skills",
  "expected the effective chart setup payload to normalize a published Projection default onto Skills",
);

const skills = buildFallbackEloSection("Skills", summary, null);
const skillLabels = skills.cards.map((card) => card.label);
assert.ok(
  skillLabels.includes("Avg ELO Change"),
  "expected the merged Skills fallback cards to absorb the projection summary instead of dropping it",
);
assert.equal(
  skillLabels.filter((label) => label === "Current ELO").length,
  1,
  "expected the merged Skills fallback cards to avoid duplicating shared labels from the old Projection tab",
);

const skillsInsight = buildFallbackEloInsight("Skills", summary, null);
assert.match(
  skillsInsight.body,
  /Average change is \+2\.4/i,
  "expected the merged Skills fallback insight to retain the old projection outlook copy",
);

console.log("elo-skills-projection-merge.test.cjs passed");
