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
  buildPlayerProfileMetricPresentation,
} = require("../utils/playerProfileMetricPresentation.ts");

const topCards = [
  {
    key: "current-elo",
    label: "Current ELO",
    value: "906",
    tone: "accent",
  },
  {
    key: "peak-elo",
    label: "Peak ELO",
    value: "1000",
    tone: "blue",
  },
  {
    key: "win-rate",
    label: "Win Rate",
    value: "11%",
    tone: "green",
  },
];

const sectionCards = [
  {
    key: "recent-form",
    label: "Recent Form",
    value: "L-L-W",
    tone: "accent",
  },
  {
    key: "games",
    label: "Rated Games",
    value: "9",
    tone: "default",
  },
  {
    key: "wins",
    label: "Wins",
    value: "1",
    tone: "green",
  },
  {
    key: "losses",
    label: "Losses",
    value: "8",
    tone: "red",
  },
  {
    key: "winrate",
    label: "Win Rate",
    value: "11%",
    tone: "red",
  },
  {
    key: "confidence",
    label: "Confidence",
    value: "75%",
    tone: "blue",
  },
];

const profileInsight = {
  title: "Recovery window",
  body: "Fochizzy is below break-even right now.",
};

const activeInsight = {
  title: "Momentum Insight",
  body: "Recent form is still dragging the short-run read.",
};

const leaderboardPresentation = buildPlayerProfileMetricPresentation({
  activeTab: "Leaderboard",
  topCards,
  sectionCards,
  profileInsight,
  activeInsight,
});

assert.equal(
  leaderboardPresentation.signalsTitle,
  "Top 3 Winning Signals",
  "expected the leaderboard tab to keep the shared top-signals heading",
);
assert.equal(
  leaderboardPresentation.featuredCard?.key,
  "current-elo",
  "expected the leaderboard tab to continue using the published top cards",
);
assert.deepEqual(
  leaderboardPresentation.secondaryCards.map((card) => card.key),
  ["peak-elo", "win-rate"],
  "expected the leaderboard tab to keep the published secondary top cards",
);
assert.deepEqual(
  leaderboardPresentation.sectionCards.map((card) => card.key),
  sectionCards.map((card) => card.key),
  "expected the leaderboard tab to keep the full section grid intact",
);
assert.equal(
  leaderboardPresentation.insightTitle,
  "Recovery window",
  "expected the leaderboard tab to keep the profile-wide insight as the primary card",
);
assert.equal(
  leaderboardPresentation.secondaryInsightBody,
  "Recent form is still dragging the short-run read.",
  "expected the leaderboard tab to still surface the tab-specific insight as supporting copy",
);

const momentumPresentation = buildPlayerProfileMetricPresentation({
  activeTab: "Momentum",
  topCards,
  sectionCards,
  profileInsight,
  activeInsight,
});

assert.equal(
  momentumPresentation.signalsTitle,
  "Top 3 Momentum Signals",
  "expected non-leaderboard tabs to show a tab-specific top-signals heading",
);
assert.equal(
  momentumPresentation.featuredCard?.key,
  "recent-form",
  "expected non-leaderboard tabs to lead with that tab's first section card",
);
assert.deepEqual(
  momentumPresentation.secondaryCards.map((card) => card.key),
  ["games", "wins"],
  "expected non-leaderboard tabs to promote the next two section cards into the top signal row",
);
assert.deepEqual(
  momentumPresentation.sectionCards.map((card) => card.key),
  ["losses", "winrate", "confidence"],
  "expected non-leaderboard tabs to move the remaining section cards into the lower grid",
);
assert.equal(
  momentumPresentation.insightTitle,
  "Momentum Insight",
  "expected non-leaderboard tabs to promote the tab-specific insight into the main insight card",
);
assert.equal(
  momentumPresentation.insightBody,
  "Recent form is still dragging the short-run read.",
  "expected the active tab insight body to become the primary explanation on non-leaderboard tabs",
);
assert.equal(
  momentumPresentation.secondaryInsightBody,
  "Fochizzy is below break-even right now.",
  "expected the profile-wide insight to remain available as supporting copy on non-leaderboard tabs",
);

console.log("player-profile-tab-presentation.test.cjs passed");
