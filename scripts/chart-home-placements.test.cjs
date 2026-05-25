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
  getChartsForSection,
  resolveChartCatalogEntry,
} = require("../components/charts/chartCatalog.ts");

assert.equal(
  resolveChartCatalogEntry("prestige_over_time").section,
  "profile",
  "expected Prestige Over Time to live under Your Profile on the chart home"
);

assert.equal(
  resolveChartCatalogEntry("efficiency_failure_scatter").section,
  "trends",
  "expected Efficiency vs Failure to live under Trends on the chart home"
);

assert.equal(
  resolveChartCatalogEntry("efficiency-failure-scatter").key,
  "efficiency_failure_scatter",
  "expected the legacy hyphenated efficiency key to resolve to the active chart-home entry"
);

assert.ok(
  getChartsForSection("profile").some((chart) => chart.key === "prestige_over_time"),
  "expected the profile section to include Prestige Over Time"
);

assert.ok(
  getChartsForSection("trends").some((chart) => chart.key === "efficiency_failure_scatter"),
  "expected the trends section to include Efficiency vs Failure"
);

console.log("chart-home-placements.test.cjs passed");
