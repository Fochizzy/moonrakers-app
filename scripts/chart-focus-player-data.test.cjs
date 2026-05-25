const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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

const {
  resolvePreferredChartPlayerId,
  buildCommonOpponentOptions,
} = require(path.join(__dirname, "..", "utils", "charts.ts"));

assert.equal(
  typeof resolvePreferredChartPlayerId,
  "function",
  "expected utils/charts.ts to export resolvePreferredChartPlayerId for defaulting the chart focus player",
);

assert.equal(
  typeof buildCommonOpponentOptions,
  "function",
  "expected utils/charts.ts to export buildCommonOpponentOptions for the chart focus-player setup",
);

const players = [
  { id: "greg", name: "Greg" },
  { id: "izzy", name: "Izzy" },
  { id: "james", name: "James" },
  { id: "ada", name: "Ada" },
  { id: "zoe", name: "Zoe" },
  { id: "liam", name: "Liam" },
];

const games = [
  { id: "g1", players: [{ id: "greg" }, { id: "james" }, { id: "izzy" }], totals: {} },
  { id: "g2", players: [{ id: "greg" }, { id: "james" }], totals: {} },
  { id: "g3", players: [{ id: "greg" }, { id: "ada" }], totals: {} },
  { id: "g4", players: [{ id: "greg" }, { id: "izzy" }, { id: "liam" }], totals: {} },
  { id: "g5", players: [{ id: "greg" }, { id: "james" }, { id: "zoe" }], totals: {} },
  { id: "g6", players: [{ id: "james" }, { id: "ada" }], totals: {} },
];

assert.equal(
  resolvePreferredChartPlayerId({
    availablePlayers: players,
    routePlayerId: null,
    authProfileId: "greg",
    authSessionUserId: "session-user",
  }),
  "greg",
  "expected the signed-in Moonrakers profile id to win when it exists in the chart player list",
);

assert.equal(
  resolvePreferredChartPlayerId({
    availablePlayers: players,
    routePlayerId: null,
    authProfileId: null,
    authSessionUserId: "izzy",
  }),
  "izzy",
  "expected the auth session user id to be the fallback default when the profile id is unavailable",
);

assert.equal(
  resolvePreferredChartPlayerId({
    availablePlayers: players,
    routePlayerId: "ada",
    authProfileId: "greg",
    authSessionUserId: "greg",
  }),
  "ada",
  "expected an explicit route player id to override the signed-in default",
);

assert.deepEqual(
  buildCommonOpponentOptions({
    playerId: "greg",
    players,
    games,
    limit: 5,
  }).map((entry) => ({
    id: entry.id,
    gamesPlayed: entry.gamesPlayed,
  })),
  [
    { id: "james", gamesPlayed: 3 },
    { id: "izzy", gamesPlayed: 2 },
    { id: "ada", gamesPlayed: 1 },
    { id: "liam", gamesPlayed: 1 },
    { id: "zoe", gamesPlayed: 1 },
  ],
  "expected the chart focus helper to rank the top five common opponents by shared games",
);

console.log("chart-focus-player-data.test.cjs passed");
