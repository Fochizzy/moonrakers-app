const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const chartHubSource = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "index.tsx"),
  "utf8",
);

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

assert.match(
  chartHubSource,
  /buildLocalChartSetupPayload/,
  "expected the charts hub to wire in a local chart-setup fallback builder",
);

assert.match(
  chartHubSource,
  /setupError && !effectiveSetupPayload/,
  "expected the charts hub to keep the hard error card only when no fallback setup payload exists",
);

const {
  buildLocalChartSetupPayload,
} = require("../lib/cloud/analytics/buildLocalChartSetupPayload.ts");

const players = [
  { id: "greg", name: "Greg", color: "blue" },
  { id: "corey", name: "Corey", color: "orange" },
  { id: "izzy", name: "Izzy", color: "purple" },
];

const linePayload = buildLocalChartSetupPayload({
  chartKey: "line_chart",
  players,
  authProfileId: "greg",
  authSessionUserId: "greg",
  routeIds: [],
});

assert.equal(linePayload.defaults.focusPlayerId, "greg");
assert.deepEqual(
  linePayload.lineModeOptions.map((option) => option.key),
  ["raw", "cumulative", "average"],
  "expected line-chart fallback setup to keep line-mode controls available",
);
assert.ok(
  linePayload.metricOptions.some((option) => option.key === "score"),
  "expected line-chart fallback setup to expose metric options",
);
assert.deepEqual(
  linePayload.defaults.scopedPlayerIds,
  ["greg", "corey", "izzy"],
  "expected line-chart fallback setup to seed scope ids from the synced roster",
);

const rivalryPayload = buildLocalChartSetupPayload({
  chartKey: "rivalry_graph",
  players,
  authProfileId: "greg",
  authSessionUserId: "greg",
  routeIds: [],
});

assert.equal(rivalryPayload.defaults.focusPlayerId, "greg");
assert.equal(
  rivalryPayload.defaults.comparePlayerId,
  "corey",
  "expected rivalry fallback setup to choose a second player by default",
);
assert.equal(rivalryPayload.metricOptions.length, 0);

const prestigePayload = buildLocalChartSetupPayload({
  chartKey: "prestige_over_time",
  players,
  authProfileId: "greg",
  authSessionUserId: "greg",
  routeIds: [],
});

assert.equal(
  prestigePayload.metricOptions.length,
  0,
  "expected prestige-over-time fallback setup to stay on its fixed metric",
);

console.log("chart-setup-local-fallback.test.cjs passed");
