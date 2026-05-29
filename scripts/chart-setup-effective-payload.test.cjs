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
  buildLocalChartSetupPayload,
} = require("../lib/cloud/analytics/buildLocalChartSetupPayload.ts");
const {
  needsChartSetupSupplement,
  resolveEffectiveChartSetupPayload,
} = require("../lib/cloud/analytics/resolveChartSetupPayload.ts");

const players = [
  { id: "greg", name: "Greg", color: "blue" },
  { id: "corey", name: "Corey", color: "orange" },
  { id: "izzy", name: "Izzy", color: "purple" },
  { id: "rev", name: "RevLoki", color: "green" },
];

const localPayload = buildLocalChartSetupPayload({
  chartKey: "bar_chart",
  players,
  authProfileId: "greg",
  authSessionUserId: "greg",
  routeIds: [],
});

const publishedPayload = {
  chartKey: "bar_chart",
  generatedAt: "2026-05-27T00:00:00.000Z",
  focusPlayerOptions: players.map((player) => ({
    key: player.id,
    label: player.name,
  })),
  comparePlayerOptions: [],
  scopePlayerOptions: players.map((player) => ({
    key: player.id,
    label: player.name,
  })),
  metricOptions: [
    { key: "score", label: "Score" },
    { key: "totalPrestige", label: "Total Prestige" },
  ],
  lineModeOptions: [],
  eloViewOptions: [],
  opponentOptions: [],
  defaults: {
    focusPlayerId: "greg",
    comparePlayerId: null,
    scopedPlayerIds: ["greg", "corey", "izzy", "rev"],
    metricKey: "totalPrestige",
    lineMode: null,
    eloTab: null,
    opponentId: null,
  },
  emptyState: null,
};

assert.equal(
  needsChartSetupSupplement({
    chartKey: "bar_chart",
    publishedPayload,
    fallbackPayload: localPayload,
  }),
  true,
  "expected the client to detect that the published bar-chart setup is thinner than the local metric catalog",
);

const effectivePayload = resolveEffectiveChartSetupPayload({
  chartKey: "bar_chart",
  publishedPayload,
  fallbackPayload: localPayload,
});

assert.ok(
  effectivePayload.metricOptions.length > publishedPayload.metricOptions.length,
  "expected the effective setup payload to add the missing local metric options",
);

assert.ok(
  effectivePayload.metricOptions.some((option) => option.key === "contracts"),
  "expected the supplemented bar-chart metric list to include deeper local metrics like contracts",
);

assert.equal(
  effectivePayload.defaults.metricKey,
  "totalPrestige",
  "expected the effective setup payload to preserve a valid selected metric",
);

console.log("chart-setup-effective-payload.test.cjs passed");
