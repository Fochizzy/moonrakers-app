const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function patchedResolveFilename(request, parent, isMain, options) {
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
  CHART_SETUP_STAGE_ORDER,
  buildScopeStageSummary,
  buildMetricStageSummary,
  buildStyleStageSummary,
  resolveChartSetupRailState,
  resolveNextChartSetupStage,
  invalidateStagesAfter,
} = require("../components/charts/chartSetupRailModel.ts");

assert.deepEqual(
  CHART_SETUP_STAGE_ORDER,
  ["scope", "metric", "style"],
  "expected the guided rail to keep the approved Scope -> Metric -> Style order",
);

assert.equal(
  buildScopeStageSummary({
    focusPlayerLabel: "Nova",
    comparePlayerLabel: "Duke",
    scopedCount: 4,
  }),
  "Nova vs Duke - 4 players",
  "expected scope summaries to read like a compact player story",
);

assert.equal(
  buildMetricStageSummary("Current ELO"),
  "Current ELO",
  "expected metric summaries to pass through the selected metric label",
);

assert.equal(
  buildStyleStageSummary({
    lineModeLabel: null,
    eloViewLabel: "Context",
    opponentLabel: "Duke",
  }),
  "Context - Duke",
  "expected style summaries to include the opponent only when the selected style needs it",
);

assert.deepEqual(
  resolveChartSetupRailState({
    activeStageKey: "metric",
    completedStages: {
      scope: true,
      metric: false,
      style: false,
    },
  }).map((stage) => [stage.key, stage.status]),
  [
    ["scope", "completed"],
    ["metric", "active"],
    ["style", "locked"],
  ],
  "expected the rail model to collapse finished stages and lock future stages behind the active one",
);

assert.equal(
  resolveNextChartSetupStage("scope", {
    scope: true,
    metric: false,
    style: false,
  }),
  "metric",
  "expected scope completion to auto-advance into Metric",
);

assert.deepEqual(
  invalidateStagesAfter("scope", {
    scope: true,
    metric: true,
    style: true,
  }),
  {
    scope: true,
    metric: false,
    style: false,
  },
  "expected changing Scope to invalidate Metric and Style",
);

console.log("chart-guided-rail-model.test.cjs passed");
