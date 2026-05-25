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
  buildAnalyticsPlayerDirectory,
} = require(path.join(__dirname, "..", "utils", "analyticsPlayers.ts"));
const {
  buildUnifiedSnapshots,
} = require(path.join(__dirname, "..", "utils", "charts.ts"));
const { buildLeaderboard } = require(path.join(__dirname, "..", "utils", "statsEngine.ts"));

assert.equal(
  typeof buildAnalyticsPlayerDirectory,
  "function",
  "expected analyticsPlayers.ts to expose a shared canonical analytics-player helper",
);

const canonicalCoreyId = "11111111-1111-4111-8111-111111111111";
const legacyCoreyId = "legacy-corey";
const izzyId = "22222222-2222-4222-8222-222222222222";
const novaId = "33333333-3333-4333-8333-333333333333";

const directory = buildAnalyticsPlayerDirectory({
  players: [
    {
      id: legacyCoreyId,
      name: "Corey",
      color: "blue",
      initials: "C",
      hasSavedGames: true,
    },
    {
      id: canonicalCoreyId,
      name: "Corey",
      color: "blue",
      initials: "CJ",
      assignedCardArtIndex: 5,
      hasSavedGames: false,
    },
    {
      id: izzyId,
      name: "Izzy",
      color: "purple",
      initials: "I",
      hasSavedGames: true,
    },
    {
      id: novaId,
      name: "Nova",
      color: "green",
      initials: "N",
      hasSavedGames: false,
    },
  ],
  groups: [],
  games: [
    {
      id: "game-1",
      players: [
        { id: legacyCoreyId, name: "Corey", color: "blue", initials: "C" },
        { id: izzyId, name: "Izzy", color: "purple", initials: "I" },
      ],
      totals: {
        [legacyCoreyId]: {
          totalPrestige: 15,
          directPrestige: 10,
          assistPrestigeReceived: 5,
          assists: 2,
          contracts: 5,
          failures: 1,
          score: 15,
        },
        [izzyId]: {
          totalPrestige: 12,
          directPrestige: 9,
          assistPrestigeReceived: 3,
          assists: 1,
          contracts: 4,
          failures: 2,
          score: 12,
        },
      },
      winnerId: legacyCoreyId,
      createdAt: 1,
    },
  ],
});

assert.equal(
  directory.aliases[legacyCoreyId],
  canonicalCoreyId,
  "expected the legacy Corey id to alias to the registered Corey profile id",
);

assert.deepEqual(
  directory.players.map((player) => player.id),
  [canonicalCoreyId, izzyId],
  "expected analytics players to keep only game-backed canonical players",
);

assert.ok(
  directory.games.every(
    (game) =>
      !game.players.some((player) => player.id === legacyCoreyId) &&
      !Object.prototype.hasOwnProperty.call(game.totals ?? {}, legacyCoreyId),
  ),
  "expected canonical analytics games to stop carrying the legacy Corey id",
);

const canonicalCoreyTotals = directory.games[0]?.totals?.[canonicalCoreyId];

assert.equal(
  canonicalCoreyTotals?.totalPrestige,
  15,
  "expected canonical Corey totals to retain historical prestige",
);

assert.equal(
  directory.games[0]?.winnerId,
  canonicalCoreyId,
  "expected winner ids to be remapped onto the canonical Corey id",
);

const leaderboard = buildLeaderboard(directory.players, directory.games);
const coreyRow = leaderboard.find((player) => player.id === canonicalCoreyId);

assert.ok(coreyRow, "expected the canonical Corey leaderboard row to exist");
assert.equal(coreyRow.games, 1, "expected canonical Corey to keep the saved game count");
assert.equal(
  coreyRow.totalPrestige,
  15,
  "expected canonical Corey to keep historical prestige in stats",
);

const snapshots = buildUnifiedSnapshots(directory.games, directory.players);
const coreySnapshot =
  snapshots[0]?.snapshot?.[canonicalCoreyId] ?? null;

assert.ok(
  coreySnapshot?.totalPrestige === 15,
  "expected canonical Corey to keep chart snapshot data after a new player is added",
);

assert.equal(
  leaderboard.some((player) => player.id === novaId),
  false,
  "expected brand-new no-game players to stay out of analytics leaderboards",
);

console.log("analytics-player-canonicalization.test.cjs passed");
