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
  resolvePreferredChartPlayerId,
  buildCommonOpponentOptions,
  buildRecentGameOpponentOptions,
  prioritizeSignedInPlayerOptions,
  resolveSignedInPlayerOptionId,
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

assert.equal(
  typeof buildRecentGameOpponentOptions,
  "function",
  "expected utils/charts.ts to export buildRecentGameOpponentOptions for server-history quick-pick fallback ordering",
);

assert.equal(
  typeof prioritizeSignedInPlayerOptions,
  "function",
  "expected utils/charts.ts to export prioritizeSignedInPlayerOptions for signed-in player quick-pick ordering",
);

assert.equal(
  typeof resolveSignedInPlayerOptionId,
  "function",
  "expected utils/charts.ts to export resolveSignedInPlayerOptionId so player pickers can reconcile the signed-in player across auth and analytics payloads",
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

assert.deepEqual(
  buildRecentGameOpponentOptions({
    playerId: "greg",
    players,
    recentGames: [
      {
        id: "rg1",
        players: [{ id: "greg" }, { id: "james" }, { id: "izzy" }],
      },
      {
        id: "rg2",
        players: [{ id: "greg" }, { id: "james" }],
      },
      {
        id: "rg3",
        players: [{ id: "greg" }, { id: "ada" }],
      },
    ],
    limit: 4,
  }).map((entry) => ({
    id: entry.id,
    gamesPlayed: entry.gamesPlayed,
  })),
  [
    { id: "james", gamesPlayed: 2 },
    { id: "ada", gamesPlayed: 1 },
    { id: "izzy", gamesPlayed: 1 },
  ],
  "expected the recent-game fallback helper to rank opponents from server-authored recent history when a dedicated quick-pick payload is unavailable",
);

assert.deepEqual(
  prioritizeSignedInPlayerOptions({
    players,
    games,
    authProfileId: "greg",
    authSessionUserId: "session-user",
    commonPlayerLimit: 4,
  }).map((entry) => entry.id),
  ["greg", "james", "izzy", "ada", "liam", "zoe"],
  "expected signed-in quick picks to pin the logged-in player first and then rank the next four most common co-play partners before the remaining alphabetical options",
);

assert.deepEqual(
  prioritizeSignedInPlayerOptions({
    players,
    games,
    authProfileId: null,
    authSessionUserId: "izzy",
    commonPlayerLimit: 2,
  }).map((entry) => entry.id),
  ["izzy", "greg", "james", "ada", "liam", "zoe"],
  "expected the session user id to drive the same signed-in quick-pick ordering when no auth profile id is available",
);

assert.deepEqual(
  prioritizeSignedInPlayerOptions({
    players: players.filter((entry) => entry.id !== "greg"),
    games,
    authProfileId: "greg",
    authSessionUserId: null,
    authProfilePlayer: {
      id: "greg",
      name: "Greg",
    },
    explicitPriorityPlayerIds: ["james", "izzy", "ada", "liam"],
    commonPlayerLimit: 4,
  }).map((entry) => entry.id),
  ["greg", "james", "izzy", "ada", "liam", "zoe"],
  "expected signed-in quick picks to inject the signed-in player when the leaderboard options miss them and then honor the server-authored top co-play order before the remaining alphabetical options",
);

assert.equal(
  resolveSignedInPlayerOptionId({
    options: [
      { id: "legacy-fochizzy", name: "Fochizzy" },
      { id: "james", name: "James" },
    ],
    authProfileId: "signed-in-uuid",
    authSessionUserId: null,
    authProfilePlayer: {
      id: "signed-in-uuid",
      name: "Fochizzy",
    },
  }),
  "legacy-fochizzy",
  "expected signed-in player resolution to fall back to canonical player-name matching when payload ids and auth ids differ",
);

console.log("chart-focus-player-data.test.cjs passed");
