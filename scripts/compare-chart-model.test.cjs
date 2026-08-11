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
  buildCompareChartModel,
} = require("../components/charts/compareChartModel.ts");

const players = [
  { id: "focus", name: "Focus", color: "#3B82F6" },
  { id: "compare", name: "Compare", color: "#A855F7" },
  { id: "other", name: "Other", color: "#22C55E" },
];

const snapshots = [
  {
    label: "Game 1",
    gameIndex: 1,
    snapshot: {
      focus: { totalPrestige: 12 },
      compare: { totalPrestige: 10 },
    },
  },
  {
    label: "Game 2",
    gameIndex: 2,
    snapshot: {
      focus: { totalPrestige: 15 },
    },
  },
  {
    label: "Game 3",
    gameIndex: 3,
    snapshot: {
      other: { totalPrestige: 19 },
    },
  },
  {
    label: "Game 4",
    gameIndex: 4,
    snapshot: {
      compare: { totalPrestige: 8 },
    },
  },
];

const model = buildCompareChartModel({
  snapshots,
  players,
  focusPlayerId: "focus",
  comparePlayerId: "compare",
  metricKey: "totalPrestige",
});

assert.ok(model, "expected a compare chart model when two players are selected");
assert.equal(model.points.length, 3, "expected games with neither compared player to be filtered out");
assert.deepEqual(
  model.points.map((point) => point.label),
  ["Game 1", "Game 2", "Game 4"],
  "expected compare timeline labels to keep only relevant games"
);
assert.deepEqual(
  model.points.map((point) => point.focusValue),
  [12, 15, null],
  "expected focus values to stay null when the focus player was not in that game"
);
assert.deepEqual(
  model.points.map((point) => point.compareValue),
  [10, null, 8],
  "expected compare values to stay null when the compare player was not in that game"
);
assert.equal(model.focusGamesPlayed, 2, "expected focus participation count to reflect visible games");
assert.equal(model.compareGamesPlayed, 2, "expected compare participation count to reflect visible games");
assert.equal(model.maxValue, 15, "expected max value to reflect the visible comparison bars");

console.log("compare-chart-model.test.cjs passed");
