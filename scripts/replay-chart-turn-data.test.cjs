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
  options
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
  buildDerivedReplay,
} = require("../components/charts/useReplayAnalytics.ts");

const replay = [
  {
    round: 1,
    label: "Round 1",
    snapshot: {
      greg: {
        playerName: "Greg",
        totalPrestige: 3,
        prestige: 3,
        directPrestige: 2,
        assistPrestigeReceived: 1,
        objectivePrestige: 0,
        score: 3,
        assists: 1,
        contracts: 1,
        failures: 0,
        turns: 1,
      },
      james: {
        playerName: "James",
        totalPrestige: 1,
        prestige: 1,
        directPrestige: 1,
        assistPrestigeReceived: 0,
        objectivePrestige: 0,
        score: 1,
        assists: 0,
        contracts: 0,
        failures: 0,
        turns: 1,
      },
    },
  },
  {
    round: 2,
    label: "Round 2",
    snapshot: {
      greg: {
        playerName: "Greg",
        totalPrestige: 5,
        prestige: 5,
        directPrestige: 3,
        assistPrestigeReceived: 1,
        objectivePrestige: 1,
        score: 5,
        assists: 1,
        contracts: 2,
        failures: 0,
        turns: 2,
      },
      james: {
        playerName: "James",
        totalPrestige: 4,
        prestige: 4,
        directPrestige: 2,
        assistPrestigeReceived: 1,
        objectivePrestige: 1,
        score: 4,
        assists: 1,
        contracts: 1,
        failures: 0,
        turns: 2,
      },
    },
  },
];

const players = [
  { id: "greg", name: "Greg", color: "#3B82F6" },
  { id: "james", name: "James", color: "#22C55E" },
];

const prestigeReplay = buildDerivedReplay(replay, players, "totalPrestige");

assert.equal(
  prestigeReplay[0].snapshot.greg.totalPrestige,
  3,
  "expected derived replay to preserve totalPrestige for the chart series"
);

assert.equal(
  prestigeReplay[1].snapshot.james.totalPrestige,
  4,
  "expected later replay points to keep the requested metric on each player snapshot"
);

assert.equal(
  prestigeReplay[1].snapshot.greg.score,
  5,
  "expected non-selected replay stats to stay available for chart readers and focus cards"
);

assert.equal(
  prestigeReplay[1].snapshot.greg.value,
  5,
  "expected the summary helper to still receive the derived metric value"
);

const deltaReplay = buildDerivedReplay(replay, players, "prestigeDelta");

assert.equal(
  deltaReplay[0].snapshot.greg.prestigeDelta,
  3,
  "expected first-round prestige delta to equal the opening prestige total"
);

assert.equal(
  deltaReplay[1].snapshot.greg.prestigeDelta,
  2,
  "expected later prestige deltas to track the round-to-round change"
);

console.log("replay-chart-turn-data.test.cjs passed");
