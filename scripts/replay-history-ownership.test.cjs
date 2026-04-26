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
  canAdjustChartFromHub,
  normalizeChartHubSelection,
} = require("../components/charts/chartCatalog.ts");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

assert.equal(
  typeof canAdjustChartFromHub,
  "function",
  "expected chartCatalog to expose a replay ownership helper for chart-detail affordances"
);

assert.equal(
  typeof normalizeChartHubSelection,
  "function",
  "expected chartCatalog to expose a replay ownership helper for charts-home selection"
);

assert.equal(
  canAdjustChartFromHub("replay_chart"),
  false,
  "expected replay_chart to stay history-owned instead of exposing charts-home adjust affordances"
);

assert.equal(
  canAdjustChartFromHub("relationship_graph"),
  true,
  "expected normal hub charts to keep charts-home adjust affordances"
);

assert.equal(
  normalizeChartHubSelection("replay_chart").key,
  "radar",
  "expected charts home to fall back to the first visible chart when replay is requested"
);

const chartIndexSource = read(path.join("app", "charts", "index.tsx"));
assert.match(
  chartIndexSource,
  /normalizeChartHubSelection\(/,
  "expected the charts home route to clamp history-owned replay requests"
);

const chartDetailSource = read(path.join("app", "charts", "[chartKey].tsx"));
assert.match(
  chartDetailSource,
  /canAdjustChartFromHub\(/,
  "expected the chart detail route to hide charts-home adjust affordances for replay"
);

console.log("replay-history-ownership.test.cjs passed");
