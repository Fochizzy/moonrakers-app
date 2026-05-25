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

const { useStore } = require("../store/useStore.ts");
const { buildPlaystyleSamples } = require("../utils/playstyleEngine.ts");
const { buildMoonrakersIntelProfile } = require("../utils/playerProfileMoonrakers.ts");

const players = [
  { id: "a", name: "Astra" },
  { id: "b", name: "Bolt" },
  { id: "c", name: "Comet" },
];

const legacyImportedGames = [
  {
    id: "legacy-1",
    winnerId: "a",
    players,
    totals: {
      a: {
        totalPrestige: 3,
        directPrestige: 3,
        assistPrestigeReceived: 0,
      },
      b: {
        totalPrestige: 4,
        directPrestige: 2,
        assistPrestigeReceived: 2,
        assistPrestigeByPlayer: { a: 2 },
        assistCountBySource: { a: 1 },
      },
      c: {
        totalPrestige: 1,
        directPrestige: 1,
        assistPrestigeReceived: 0,
      },
    },
    rounds: [
      {
        playerId: "b",
        prestige: 2,
        contracts: 1,
        failures: 0,
        assistRecipients: { a: 1 },
      },
      {
        playerId: "a",
        prestige: 3,
        contracts: 1,
        failures: 0,
        assistRecipients: {},
      },
    ],
  },
  {
    id: "legacy-2",
    winnerId: "b",
    players,
    totals: {
      a: {
        totalPrestige: 0,
        directPrestige: 0,
        assistPrestigeReceived: 0,
      },
      b: {
        totalPrestige: 2,
        directPrestige: 1,
        assistPrestigeReceived: 1,
        assistPrestigeFromPlayers: { a: 1 },
        assistCountBySource: { a: 1 },
      },
      c: {
        totalPrestige: 6,
        directPrestige: 6,
        assistPrestigeReceived: 0,
      },
    },
    rounds: [
      {
        playerId: "c",
        prestige: 6,
        contracts: 1,
        failures: 0,
        assistRecipients: {},
      },
      {
        playerId: "b",
        prestige: 1,
        contracts: 1,
        failures: 0,
        assistRecipients: { a: 1 },
      },
      {
        playerId: "a",
        prestige: 0,
        contracts: 0,
        failures: 0,
        assistRecipients: {},
      },
    ],
  },
  {
    id: "legacy-3",
    winnerId: "c",
    players,
    totals: {
      a: {
        totalPrestige: 1,
        directPrestige: 1,
        assistPrestigeReceived: 0,
      },
      b: {
        totalPrestige: 5,
        directPrestige: 2,
        assistPrestigeReceived: 3,
        assistSources: { a: 3 },
        assistCountBySource: { a: 1 },
      },
      c: {
        totalPrestige: 7,
        directPrestige: 7,
        assistPrestigeReceived: 0,
      },
    },
    rounds: [
      {
        playerId: "b",
        prestige: 2,
        contracts: 1,
        failures: 0,
      },
      {
        playerId: "c",
        prestige: 7,
        contracts: 1,
        failures: 0,
      },
    ],
  },
];

useStore.getState().resetStore();
useStore.getState().setPlayers(players);
useStore.getState().mergeImportedGames(legacyImportedGames);

const state = useStore.getState();
const profile = buildMoonrakersIntelProfile({
  playerId: "a",
  players: state.players,
  games: state.games,
  samples: buildPlaystyleSamples(state.players, state.games),
});

assert.equal(profile.hasData, true);
assert.equal(profile.assistContext.assistGapToTargetLabel, "0.0");
assert.equal(profile.assistContext.assistGapToLeaderLabel, "3.0");
assert.equal(profile.assistContext.assistsAtSixPlusLabel, "0 (0%)");
assert.equal(profile.assistContext.assistsOverFiveBehindLeaderLabel, "1 (50%)");
assert.equal(profile.assistContext.assistPrestigeGainedLabel, "6.0");
assert.equal(profile.assistContext.assistEventsLabel, "3 assists");

console.log("assist-context-import-backfill.e2e.test.cjs passed");
