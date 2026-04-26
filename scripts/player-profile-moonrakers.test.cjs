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

const { buildPlaystyleSamples } = require("../utils/playstyleEngine.ts");
const { buildMoonrakersIntelProfile } = require("../utils/playerProfileMoonrakers.ts");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const players = [
  { id: "a", name: "Astra", color: "#A855F7" },
  { id: "b", name: "Bolt", color: "#22C55E" },
  { id: "c", name: "Comet", color: "#60A5FA" },
  { id: "d", name: "Drift", color: "#FBBF24" },
  { id: "e", name: "Echo", color: "#FB7185" },
];

const games = [
  {
    id: "g-1",
    winnerId: "a",
    players: [
      { id: "a", startOrder: 0 },
      { id: "b", startOrder: 1 },
      { id: "c", startOrder: 2 },
      { id: "d", startOrder: 3 },
    ],
    totals: {
      a: {
        totalPrestige: 13,
        directPrestige: 7,
        assistPrestigeReceived: 3,
        objectiveCount: 3,
        assists: 2,
        failures: 0,
        contracts: 2,
        assistPrestigeBySource: { b: 2, c: 1 },
      },
      b: {
        totalPrestige: 10,
        directPrestige: 6,
        assistPrestigeReceived: 1,
        objectiveCount: 3,
        assists: 1,
        failures: 1,
        contracts: 2,
        assistPrestigeBySource: { a: 1 },
      },
      c: {
        totalPrestige: 8,
        directPrestige: 5,
        assistPrestigeReceived: 1,
        objectiveCount: 2,
        assists: 1,
        failures: 1,
        contracts: 1,
        assistPrestigeBySource: { a: 1 },
      },
      d: {
        totalPrestige: 6,
        directPrestige: 5,
        assistPrestigeReceived: 0,
        objectiveCount: 1,
        assists: 0,
        failures: 2,
        contracts: 1,
        assistPrestigeBySource: {},
      },
    },
    rounds: [
      { playerId: "a", contracts: 1, failures: 0, assistRecipients: { b: 1, c: 1 } },
      { playerId: "a", contracts: 0, failures: 0, assistRecipients: {} },
      { playerId: "a", contracts: 0, failures: 0, objectiveCount: 3, metaType: "bonusObjective" },
    ],
  },
  {
    id: "g-2",
    winnerId: "a",
    players: [
      { id: "a", startOrder: 0 },
      { id: "b", startOrder: 1 },
      { id: "c", startOrder: 2 },
      { id: "e", startOrder: 3 },
    ],
    totals: {
      a: {
        totalPrestige: 11,
        directPrestige: 9,
        assistPrestigeReceived: 1,
        objectiveCount: 0,
        assists: 1,
        failures: 0,
        contracts: 3,
        assistPrestigeBySource: { b: 1 },
      },
      b: {
        totalPrestige: 9,
        directPrestige: 6,
        assistPrestigeReceived: 2,
        objectiveCount: 1,
        assists: 2,
        failures: 1,
        contracts: 2,
        assistPrestigeBySource: { a: 1, c: 1 },
      },
      c: {
        totalPrestige: 7,
        directPrestige: 6,
        assistPrestigeReceived: 0,
        objectiveCount: 0,
        assists: 0,
        failures: 1,
        contracts: 2,
        assistPrestigeBySource: {},
      },
      e: {
        totalPrestige: 6,
        directPrestige: 5,
        assistPrestigeReceived: 0,
        objectiveCount: 0,
        assists: 0,
        failures: 1,
        contracts: 2,
        assistPrestigeBySource: {},
      },
    },
    rounds: [
      { playerId: "a", contracts: 2, failures: 0, assistRecipients: { b: 1 } },
      { playerId: "a", contracts: 1, failures: 0, assistRecipients: {} },
    ],
  },
  {
    id: "g-3",
    winnerId: "a",
    players: [
      { id: "a", startOrder: 1 },
      { id: "b", startOrder: 0 },
      { id: "d", startOrder: 2 },
      { id: "e", startOrder: 3 },
    ],
    totals: {
      a: {
        totalPrestige: 10,
        directPrestige: 8,
        assistPrestigeReceived: 0,
        objectiveCount: 2,
        assists: 1,
        failures: 0,
        contracts: 2,
        assistPrestigeBySource: {},
      },
      b: {
        totalPrestige: 9,
        directPrestige: 7,
        assistPrestigeReceived: 1,
        objectiveCount: 1,
        assists: 1,
        failures: 1,
        contracts: 2,
        assistPrestigeBySource: { a: 1 },
      },
      d: {
        totalPrestige: 7,
        directPrestige: 6,
        assistPrestigeReceived: 0,
        objectiveCount: 1,
        assists: 0,
        failures: 1,
        contracts: 2,
        assistPrestigeBySource: {},
      },
      e: {
        totalPrestige: 6,
        directPrestige: 5,
        assistPrestigeReceived: 0,
        objectiveCount: 1,
        assists: 0,
        failures: 1,
        contracts: 2,
        assistPrestigeBySource: {},
      },
    },
    rounds: [
      { playerId: "a", contracts: 2, failures: 0, assistRecipients: { b: 1 } },
      { playerId: "a", contracts: 0, failures: 0, objectiveCount: 2, metaType: "bonusObjective" },
    ],
  },
  {
    id: "g-4",
    winnerId: "c",
    players: [
      { id: "a", startOrder: 2 },
      { id: "c", startOrder: 0 },
      { id: "d", startOrder: 1 },
    ],
    totals: {
      a: {
        totalPrestige: 5,
        directPrestige: 4,
        assistPrestigeReceived: 0,
        objectiveCount: 1,
        assists: 0,
        failures: 2,
        contracts: 1,
        assistPrestigeBySource: {},
      },
      c: {
        totalPrestige: 10,
        directPrestige: 7,
        assistPrestigeReceived: 1,
        objectiveCount: 2,
        assists: 1,
        failures: 0,
        contracts: 2,
        assistPrestigeBySource: { b: 1 },
      },
      d: {
        totalPrestige: 7,
        directPrestige: 5,
        assistPrestigeReceived: 0,
        objectiveCount: 2,
        assists: 0,
        failures: 1,
        contracts: 2,
        assistPrestigeBySource: {},
      },
    },
    rounds: [
      { playerId: "a", contracts: 0, failures: 0, assistRecipients: {} },
      { playerId: "a", contracts: 1, failures: 2, assistRecipients: {} },
      { playerId: "a", contracts: 0, failures: 0, objectiveCount: 1, metaType: "bonusObjective" },
    ],
  },
  {
    id: "g-5",
    winnerId: "c",
    players: [
      { id: "a", startOrder: 2 },
      { id: "c", startOrder: 0 },
      { id: "e", startOrder: 1 },
    ],
    totals: {
      a: {
        totalPrestige: 4,
        directPrestige: 4,
        assistPrestigeReceived: 0,
        objectiveCount: 0,
        assists: 0,
        failures: 1,
        contracts: 1,
        assistPrestigeBySource: {},
      },
      c: {
        totalPrestige: 9,
        directPrestige: 7,
        assistPrestigeReceived: 0,
        objectiveCount: 2,
        assists: 0,
        failures: 0,
        contracts: 2,
        assistPrestigeBySource: {},
      },
      e: {
        totalPrestige: 7,
        directPrestige: 6,
        assistPrestigeReceived: 0,
        objectiveCount: 1,
        assists: 0,
        failures: 1,
        contracts: 2,
        assistPrestigeBySource: {},
      },
    },
    rounds: [
      { playerId: "a", contracts: 1, failures: 1, assistRecipients: {} },
    ],
  },
  {
    id: "g-6",
    winnerId: "c",
    players: [
      { id: "a", startOrder: 3 },
      { id: "c", startOrder: 0 },
      { id: "d", startOrder: 1 },
      { id: "e", startOrder: 2 },
    ],
    totals: {
      a: {
        totalPrestige: 6,
        directPrestige: 5,
        assistPrestigeReceived: 0,
        objectiveCount: 0,
        assists: 0,
        failures: 1,
        contracts: 1,
        assistPrestigeBySource: {},
      },
      c: {
        totalPrestige: 11,
        directPrestige: 8,
        assistPrestigeReceived: 1,
        objectiveCount: 2,
        assists: 1,
        failures: 0,
        contracts: 2,
        assistPrestigeBySource: { d: 1 },
      },
      d: {
        totalPrestige: 8,
        directPrestige: 6,
        assistPrestigeReceived: 0,
        objectiveCount: 2,
        assists: 0,
        failures: 1,
        contracts: 2,
        assistPrestigeBySource: {},
      },
      e: {
        totalPrestige: 7,
        directPrestige: 6,
        assistPrestigeReceived: 0,
        objectiveCount: 1,
        assists: 0,
        failures: 1,
        contracts: 2,
        assistPrestigeBySource: {},
      },
    },
    rounds: [
      { playerId: "a", contracts: 0, failures: 0, assistRecipients: {} },
      { playerId: "a", contracts: 1, failures: 1, assistRecipients: {} },
    ],
  },
];

{
  const samples = buildPlaystyleSamples(players, games);
  const first = samples.find((sample) => sample.gameId === "g-1" && sample.playerId === "a");

  assert.equal(first.directPrestige, 7);
  assert.equal(first.assistPrestigeReceived, 3);
}

{
  const samples = buildPlaystyleSamples(players, games);
  const profile = buildMoonrakersIntelProfile({
    playerId: "a",
    players,
    games,
    samples,
  });

  assert.equal(profile.hasData, true);
  assert.equal(profile.playstyle.styleRead, "Direct");
  assert.equal(profile.bestCondition.label, "Best in 4p");
  assert.equal(profile.worstCondition.label, "Worst from Late Seat");
  assert.equal(profile.baseDiscipline.baseRateLabel, "25%");
  assert.equal(profile.objectiveProfile.highObjectiveGamesLabel, "2/6");
  assert.equal(profile.supportProfile.bestSupportPartner.playerName, "Bolt");
  assert.equal(profile.supportProfile.mostCommonAssistTarget.playerName, "Bolt");
}

{
  const limitedGames = games.slice(0, 2);
  const profile = buildMoonrakersIntelProfile({
    playerId: "d",
    players,
    games: limitedGames,
    samples: buildPlaystyleSamples(players, limitedGames),
  });

  assert.equal(profile.hasData, false);
  assert.match(profile.emptyTitle, /Not enough Moonrakers data yet/i);
}

{
  const profileSource = read(path.join("app", "player-profile", "[playerId].tsx"));
  assert.match(profileSource, /MoonrakersIntelSection/);
  assert.match(profileSource, /<MoonrakersIntelSection profile=\{moonrakersIntel\} \/>/);

  const componentSource = read(path.join("components", "player", "MoonrakersIntelSection.tsx"));
  assert.match(componentSource, /Moonrakers Intel/);
  assert.match(componentSource, /Playstyle/);
  assert.match(componentSource, /Best Condition/);
  assert.match(componentSource, /Worst Condition/);
  assert.match(componentSource, /Base Discipline/);
  assert.match(componentSource, /Objective Profile/);
  assert.match(componentSource, /Support Profile/);
}

console.log("player-profile-moonrakers.test.cjs passed");
