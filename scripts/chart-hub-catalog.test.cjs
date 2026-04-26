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
  resolveChartCatalogEntry,
} = require("../components/charts/chartCatalog.ts");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

assert.equal(
  resolveChartCatalogEntry("assist_network_overview").key,
  "relationship_graph",
  "expected the retired assist-network chart slot to keep the relationship_graph key"
);

assert.equal(
  resolveChartCatalogEntry("relationship_graph").title,
  "Assist Network",
  "expected the profile chart slot to be renamed to Assist Network"
);

const chartDetailSource = read(path.join("app", "charts", "[chartKey].tsx"));
assert.doesNotMatch(
  chartDetailSource,
  /RelationshipGraphVariant|normalizeGraphVariant|graphVariant\?:|graphVariant\s*:/,
  "expected the chart detail route to drop the retired graph-variant plumbing"
);

const chartIndexSource = read(path.join("app", "charts", "index.tsx"));
assert.doesNotMatch(
  chartIndexSource,
  /detailMode\s*=|params\.graphVariant|graphVariant\s*=/,
  "expected the charts hub launch contract to stop wiring retired graphVariant params"
);

const chartHelpersSource = read(path.join("utils", "chartHelpers.tsx"));
assert.doesNotMatch(
  chartHelpersSource,
  /case 'assist-network-overview':/,
  "expected legacy chart helpers to stop treating assist-network-overview as a separate chart case"
);

console.log("chart-hub-catalog.test.cjs passed");
