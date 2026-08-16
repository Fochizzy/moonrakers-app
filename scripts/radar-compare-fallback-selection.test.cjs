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
  buildLocalChartDetailState,
} = require(path.join(projectRoot, "utils", "chartDetailLocalData.ts"));

const detailSource = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "[chartKey].tsx"),
  "utf8",
);

const players = [
  { id: "izzy", name: "Izzy", color: "#A855F7" },
  { id: "greg", name: "Greg", color: "#3B82F6" },
];

const games = [
  {
    id: "radar-compare-1",
    createdAt: 100,
    players,
    totals: {
      izzy: {
        score: 9,
        totalPrestige: 9,
        directPrestige: 5,
        assistPrestigeReceived: 2,
        objectivePrestige: 2,
        contracts: 3,
        failures: 1,
        assists: 1,
      },
      greg: {
        score: 5,
        totalPrestige: 5,
        directPrestige: 2,
        assistPrestigeReceived: 1,
        objectivePrestige: 2,
        contracts: 1,
        failures: 0,
        assists: 2,
      },
    },
  },
];

const localRadarState = buildLocalChartDetailState({
  chartKey: "radar",
  players,
  games,
  routePlayerId: "izzy",
  routeCompareId: "greg",
});

assert.equal(
  localRadarState.comparePlayer?.id,
  "greg",
  "expected radar fallback state to keep the selected compare player",
);

assert.ok(
  localRadarState.radarPrimary,
  "expected radar fallback state to keep the selected focus player's trait profile",
);

assert.ok(
  localRadarState.radarComparison,
  "expected radar fallback state to build a comparison radar profile when a compare player is selected",
);

assert.match(
  detailSource,
  /comparison=\{localChartData\.radarComparison \?\? undefined\}/,
  "expected the radar detail fallback route to forward comparison stats into RadarChart",
);

console.log("radar-compare-fallback-selection.test.cjs passed");
