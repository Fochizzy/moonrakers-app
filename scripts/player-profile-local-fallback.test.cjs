const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const profileSource = fs.readFileSync(
  path.join(projectRoot, "app", "player-profile", "[playerId].tsx"),
  "utf8",
);
const historySource = fs.readFileSync(
  path.join(projectRoot, "app", "history.tsx"),
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
  profileSource,
  /buildLocalPlayerProfileFallback/,
  "expected the player profile route to wire a local fallback helper for Moonrakers intel and recent games",
);

assert.match(
  historySource,
  /displayedGames\.length - index/,
  "expected the history screen to continue rendering archive game numbers from the visible history list",
);

const {
  buildLocalPlayerProfileFallback,
} = require("../lib/cloud/analytics/buildLocalPlayerProfileFallback.ts");

const players = [
  { id: "a", name: "Astra" },
  { id: "b", name: "Bolt" },
  { id: "c", name: "Comet" },
];

const games = [
  {
    id: "g-older",
    winnerId: "b",
    createdAt: 100,
    players,
    totals: {
      a: {
        totalPrestige: 3,
        directPrestige: 2,
        assistPrestigeReceived: 1,
        assists: 1,
        contracts: 1,
        failures: 0,
      },
      b: {
        totalPrestige: 6,
        directPrestige: 6,
        assistPrestigeReceived: 0,
        assists: 0,
        contracts: 1,
        failures: 0,
      },
      c: {
        totalPrestige: 2,
        directPrestige: 2,
        assistPrestigeReceived: 0,
        assists: 0,
        contracts: 1,
        failures: 0,
      },
    },
    rounds: [
      {
        playerId: "a",
        prestige: 3,
        contracts: 1,
        failures: 0,
        assistRecipients: { b: 1 },
        assistPrestigeRecipients: { b: 1 },
        objectiveCount: 0,
      },
    ],
  },
  {
    id: "g-newer",
    winnerId: "a",
    createdAt: 200,
    players,
    totals: {
      a: {
        totalPrestige: 8,
        directPrestige: 7,
        assistPrestigeReceived: 1,
        assists: 1,
        contracts: 2,
        failures: 0,
      },
      b: {
        totalPrestige: 5,
        directPrestige: 4,
        assistPrestigeReceived: 1,
        assists: 1,
        contracts: 1,
        failures: 1,
      },
      c: {
        totalPrestige: 4,
        directPrestige: 4,
        assistPrestigeReceived: 0,
        assists: 0,
        contracts: 1,
        failures: 1,
      },
    },
    rounds: [
      {
        playerId: "a",
        prestige: 4,
        contracts: 1,
        failures: 0,
        assistRecipients: { b: 1 },
        assistPrestigeRecipients: { b: 1 },
        objectiveCount: 1,
      },
    ],
  },
  {
    id: "g-newest",
    winnerId: "a",
    createdAt: 300,
    players,
    totals: {
      a: {
        totalPrestige: 9,
        directPrestige: 7,
        assistPrestigeReceived: 2,
        assists: 2,
        contracts: 2,
        failures: 0,
      },
      b: {
        totalPrestige: 4,
        directPrestige: 4,
        assistPrestigeReceived: 0,
        assists: 0,
        contracts: 1,
        failures: 1,
      },
      c: {
        totalPrestige: 5,
        directPrestige: 5,
        assistPrestigeReceived: 0,
        assists: 0,
        contracts: 1,
        failures: 1,
      },
    },
    rounds: [
      {
        playerId: "a",
        prestige: 5,
        contracts: 1,
        failures: 0,
        assistRecipients: { c: 1, b: 1 },
        assistPrestigeRecipients: { c: 1, b: 1 },
        objectiveCount: 1,
      },
    ],
  },
];

{
  const fallback = buildLocalPlayerProfileFallback({
    playerId: "a",
    opponentId: null,
    players,
    games,
    recentGamesPayload: [
      {
        id: "g-newer",
        gameId: "g-newer",
        createdAt: 200,
        winnerId: "a",
        players,
      },
    ],
    moonrakersIntelPayload: {
      hasData: false,
      emptyTitle: "Not enough Moonrakers data yet",
      emptyBody: "Finish a few more games.",
    },
  });

  assert.equal(fallback.moonrakersIntel.hasData, true);
  assert.deepEqual(
    fallback.recentGames.map((game) => game.id ?? game.gameId),
    ["g-newest", "g-newer", "g-older"],
    "expected local recent games to merge in the newer and older tracked store games instead of stopping at a partial server list",
  );
  assert.deepEqual(
    fallback.recentGames.map((game) => game.historyOrdinal),
    [3, 2, 1],
    "expected merged profile recent games to keep the same Game N numbering used by the default History archive ordering",
  );
}

{
  const fallback = buildLocalPlayerProfileFallback({
    playerId: "a",
    opponentId: "b",
    players,
    games,
    recentGamesPayload: [],
    moonrakersIntelPayload: null,
  });

  assert.deepEqual(
    fallback.recentGames.map((game) => game.id ?? game.gameId),
    ["g-newest", "g-newer", "g-older"],
    "expected opponent-filtered recent games to still include every shared finished game from the local store",
  );
  assert.deepEqual(
    fallback.recentGames.map((game) => game.historyOrdinal),
    [3, 2, 1],
    "expected opponent-filtered profile recent games to preserve their global History numbering",
  );
  assert.equal(
    fallback.moonrakersIntel.hasData,
    true,
    "expected Moonrakers intel fallback to stay profile-wide and reuse the local finished-game history",
  );
}

console.log("player-profile-local-fallback.test.cjs passed");
