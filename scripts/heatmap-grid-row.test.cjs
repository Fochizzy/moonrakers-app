const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const ts = require("typescript");

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

const utils = require(path.join(
  __dirname,
  "..",
  "components",
  "charts",
  "heatmapUtils.ts"
));

const resolvedFromSummary = utils.resolveHeatmapGridRow(
  {
    id: "greg",
    shortLabel: "Greg",
    summary: { average: 10, peak: 15, latest: 8, consistency: 3 },
    cells: [],
  },
  "#a855f7"
);

assert.equal(resolvedFromSummary.name, "Greg");
assert.equal(resolvedFromSummary.averageRaw, 10);
assert.equal(resolvedFromSummary.peakRaw, 15);
assert.equal(resolvedFromSummary.latestRaw, 8);

const preservedExplicitFields = utils.resolveHeatmapGridRow(
  {
    id: "james",
    name: "James",
    colorValue: "#22c55e",
    averageRaw: 12.7,
    peakRaw: 16,
    latestRaw: 15,
    summary: { average: 1, peak: 1, latest: 1, consistency: 1 },
    cells: [],
  },
  "#a855f7"
);

assert.equal(preservedExplicitFields.colorValue, "#22c55e");
assert.equal(preservedExplicitFields.averageRaw, 12.7);
assert.equal(preservedExplicitFields.peakRaw, 16);
assert.equal(preservedExplicitFields.latestRaw, 15);

console.log("heatmap-grid-row.test.cjs passed");
