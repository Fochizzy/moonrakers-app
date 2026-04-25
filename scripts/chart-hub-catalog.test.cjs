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
  CHART_SECTIONS,
  getChartsForSection,
  getVisibleChartCatalog,
  resolveChartCatalogEntry,
} = require("../components/charts/chartCatalog.ts");

assert.deepEqual(
  CHART_SECTIONS.map((section) => section.title),
  ["Your Profile", "Matchups", "Trends"],
  "expected the chart hub to expose the consolidated section titles"
);

assert.deepEqual(
  getChartsForSection("profile").map((chart) => chart.key),
  [
    "radar",
    "consistency_band",
    "elo",
    "stacked_bar_chart",
    "relationship_graph",
  ],
  "expected Your Profile to contain radar, consistency, ELO, stacked bar, and the combined relationship graph"
);

assert.deepEqual(
  getChartsForSection("matchup").map((chart) => chart.key),
  ["head_to_head", "rivalry_graph", "sparkline"],
  "expected Matchups to contain head-to-head, rivalry, and sparkline"
);

assert.deepEqual(
  getChartsForSection("trends").map((chart) => chart.key),
  [
    "line_chart",
    "prestige_over_time",
    "bump_chart",
    "bar_chart",
    "heatmap",
    "efficiency_failure_scatter",
  ],
  "expected Trends to contain line, prestige over time, bump, bar, heatmap, and efficiency-vs-failure charts"
);

assert.equal(
  resolveChartCatalogEntry("assist_network_overview").key,
  "relationship_graph",
  "expected the retired assist-network chart key to resolve to the combined relationship graph"
);

assert.equal(
  resolveChartCatalogEntry("relationship_graph").title,
  "Assist Network",
  "expected the profile chart slot to be renamed to Assist Network"
);

assert.equal(
  getVisibleChartCatalog().some((chart) => chart.key === "replay_chart"),
  false,
  "expected Replay Chart to be removed from the chart hub because it lives in History"
);

console.log("chart-hub-catalog.test.cjs passed");
