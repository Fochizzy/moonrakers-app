const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const helperPath = path.join(projectRoot, "utils", "ratingTabFallbacks.ts");

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

const momentum = buildFallbackEloSection("Momentum", summary, null);
assert.equal(momentum.title, "Momentum Snapshot");
assert.deepEqual(
  momentum.cards.map((card) => card.label),
  ["Recent Form", "Avg ELO Change", "Wins", "Losses", "Win Rate", "Confidence"],
  "expected Momentum fallback cards to expose real momentum metrics from the published summary",
);
assert.equal(
  momentum.cards[0].value,
  "3 wins in last 4",
  "expected Momentum fallback cards to summarize recent form as wins over the trailing sample",
);
assert.equal(momentum.cards[1].value, "+2.4");

const context = buildFallbackEloSection("Context", summary, "Corey");
assert.equal(context.title, "Context Split");
assert.deepEqual(
  context.cards.map((card) => card.label),
  ["Games vs Corey", "H2H Win Rate", "Filter Wins", "Filter Losses", "Current ELO", "Confidence"],
  "expected Context fallback cards to include opponent-aware labels and server summary values",
);
assert.equal(context.cards[0].value, "12");
assert.equal(context.cards[1].value, "58%");

const projection = buildFallbackEloSection("Projection", summary, null);
assert.equal(projection.title, "Projection Window");
assert.deepEqual(
  projection.cards.map((card) => card.label),
  ["Current ELO", "Avg ELO Change", "Best Single Game", "Worst Single Game", "Peak ELO", "Confidence"],
  "expected Projection fallback cards to expose projection-oriented summary values when server sections are missing",
);
assert.equal(projection.cards[2].value, "+18");
assert.equal(projection.cards[3].value, "-13");

const momentumInsight = buildFallbackEloInsight("Momentum", summary, null);
assert.equal(momentumInsight.title, "Momentum Insight");
assert.match(momentumInsight.body, /recent form: 3 wins in last 4/i);
assert.match(momentumInsight.body, /Avg ELO change: \+2\.4/i);

const contextInsight = buildFallbackEloInsight("Context", summary, "Corey");
assert.equal(contextInsight.title, "Context Insight");
assert.match(contextInsight.body, /7 win/i);
assert.match(contextInsight.body, /against Corey/i);

const projectionInsight = buildFallbackEloInsight("Projection", summary, null);
assert.equal(projectionInsight.title, "Projection Insight");
assert.match(projectionInsight.body, /Average change is \+2\.4/i);
assert.match(projectionInsight.body, /best swing of \+18/i);
assert.match(projectionInsight.body, /worst swing of -13/i);

console.log("elo-tab-fallbacks.test.cjs passed");
