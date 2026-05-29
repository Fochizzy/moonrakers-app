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
  const assistContextPlayers = [
    { id: "a", name: "Astra" },
    { id: "b", name: "Bolt" },
    { id: "c", name: "Comet" },
  ];
  const assistContextGames = [
    {
      id: "pc-1",
      winnerId: "a",
      players: [{ id: "a" }, { id: "b" }, { id: "c" }],
      totals: {
        a: { totalPrestige: 9, directPrestige: 9, assistPrestigeReceived: 0 },
        b: { totalPrestige: 5, directPrestige: 5, assistPrestigeReceived: 0 },
        c: { totalPrestige: 4, directPrestige: 4, assistPrestigeReceived: 0 },
      },
      rounds: [
        {
          playerId: "a",
          prestige: 3,
          contracts: 1,
          failures: 0,
          assistRecipients: { b: 1 },
          assistPrestigeRecipients: { b: 2 },
        },
        {
          playerId: "b",
          prestige: 2,
          contracts: 1,
          failures: 0,
          assistRecipients: { a: 2 },
          assistPrestigeRecipients: { a: 4 },
        },
        {
          playerId: "c",
          prestige: 4,
          contracts: 1,
          failures: 0,
          assistRecipients: {},
          assistPrestigeRecipients: {},
        },
        {
          playerId: "a",
          prestige: 1,
          contracts: 1,
          failures: 0,
          assistRecipients: { c: 1, b: 1 },
          assistPrestigeRecipients: { c: 3, b: 1 },
        },
        {
          playerId: "a",
          prestige: 2,
          contracts: 0,
          failures: 0,
          assistRecipients: {},
          assistPrestigeRecipients: {},
          metaType: "bonusObjective",
        },
        {
          playerId: "a",
          prestige: 0,
          contracts: 1,
          failures: 0,
          assistRecipients: { b: 1 },
          assistPrestigeRecipients: { b: 2 },
        },
      ],
    },
    {
      id: "pc-2",
      winnerId: "b",
      players: [{ id: "a" }, { id: "b" }, { id: "c" }],
      totals: {
        a: { totalPrestige: 2, directPrestige: 0, assistPrestigeReceived: 2 },
        b: { totalPrestige: 1, directPrestige: 1, assistPrestigeReceived: 0 },
        c: { totalPrestige: 6, directPrestige: 6, assistPrestigeReceived: 0 },
      },
      rounds: [
        {
          playerId: "c",
          prestige: 6,
          contracts: 1,
          failures: 0,
          assistRecipients: {},
          assistPrestigeRecipients: {},
        },
        {
          playerId: "b",
          prestige: 1,
          contracts: 1,
          failures: 0,
          assistRecipients: { a: 1 },
          assistPrestigeRecipients: { a: 2 },
        },
        {
          playerId: "a",
          prestige: 0,
          contracts: 0,
          failures: 0,
          assistRecipients: {},
          assistPrestigeRecipients: {},
        },
      ],
    },
    {
      id: "pc-3",
      winnerId: "c",
      players: [{ id: "a" }, { id: "b" }, { id: "c" }],
      totals: {
        a: { totalPrestige: 1, directPrestige: 1, assistPrestigeReceived: 0 },
        b: { totalPrestige: 2, directPrestige: 2, assistPrestigeReceived: 0 },
        c: { totalPrestige: 3, directPrestige: 3, assistPrestigeReceived: 0 },
      },
      rounds: [
        {
          playerId: "a",
          prestige: 1,
          contracts: 1,
          failures: 0,
          assistRecipients: {},
          assistPrestigeRecipients: {},
        },
        {
          playerId: "b",
          prestige: 2,
          contracts: 1,
          failures: 0,
          assistRecipients: {},
          assistPrestigeRecipients: {},
        },
        {
          playerId: "c",
          prestige: 3,
          contracts: 1,
          failures: 0,
          assistRecipients: {},
          assistPrestigeRecipients: {},
        },
      ],
    },
  ];

  const profile = buildMoonrakersIntelProfile({
    playerId: "a",
    players: assistContextPlayers,
    games: assistContextGames,
    samples: buildPlaystyleSamples(assistContextPlayers, assistContextGames),
  });

  assert.equal(profile.hasData, true);
  assert.equal(profile.assistContext.assistGapToTargetLabel, "0.7");
  assert.equal(profile.assistContext.assistGapToLeaderLabel, "2.0");
  assert.equal(profile.assistContext.assistsAtSixPlusLabel, "0 (0%)");
  assert.equal(profile.assistContext.assistsOverFiveBehindLeaderLabel, "1 (33%)");
  assert.equal(profile.assistContext.assistPrestigeGainedLabel, "6.0");
  assert.equal(profile.assistContext.assistEventsLabel, "3 assists");
  assert.equal(profile.assistContext.importHealthLabel, "Exact assist timing");
}

{
  const inferredOnlyPlayers = [
    { id: "a", name: "Astra" },
    { id: "b", name: "Bolt" },
    { id: "c", name: "Comet" },
  ];
  const inferredOnlyGames = [
    {
      id: "quality-1",
      winnerId: "a",
      players: [{ id: "a" }, { id: "b" }, { id: "c" }],
      totals: {
        a: { totalPrestige: 2, directPrestige: 2, assistPrestigeReceived: 0 },
        b: {
          totalPrestige: 4,
          directPrestige: 2,
          assistPrestigeReceived: 2,
          assistPrestigeByPlayer: { a: 2 },
          assistCountBySource: { a: 1 },
        },
        c: { totalPrestige: 6, directPrestige: 6, assistPrestigeReceived: 0 },
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
          prestige: 6,
          contracts: 1,
          failures: 0,
        },
      ],
    },
    {
      id: "quality-2",
      winnerId: "b",
      players: [{ id: "a" }, { id: "b" }, { id: "c" }],
      totals: {
        a: { totalPrestige: 0, directPrestige: 0, assistPrestigeReceived: 0 },
        b: {
          totalPrestige: 3,
          directPrestige: 1,
          assistPrestigeReceived: 2,
          assistSources: { a: 2 },
          assistCountBySource: { a: 1 },
        },
        c: { totalPrestige: 1, directPrestige: 1, assistPrestigeReceived: 0 },
      },
      rounds: [
        {
          playerId: "b",
          prestige: 1,
          contracts: 1,
          failures: 0,
        },
        {
          playerId: "c",
          prestige: 1,
          contracts: 1,
          failures: 0,
        },
      ],
    },
    {
      id: "quality-3",
      winnerId: "c",
      players: [{ id: "a" }, { id: "b" }, { id: "c" }],
      totals: {
        a: { totalPrestige: 1, directPrestige: 1, assistPrestigeReceived: 0 },
        b: { totalPrestige: 2, directPrestige: 2, assistPrestigeReceived: 0 },
        c: { totalPrestige: 3, directPrestige: 3, assistPrestigeReceived: 0 },
      },
      rounds: [
        {
          playerId: "a",
          prestige: 1,
          contracts: 1,
          failures: 0,
        },
        {
          playerId: "b",
          prestige: 2,
          contracts: 1,
          failures: 0,
        },
        {
          playerId: "c",
          prestige: 3,
          contracts: 1,
          failures: 0,
        },
      ],
    },
  ];

  const profile = buildMoonrakersIntelProfile({
    playerId: "a",
    players: inferredOnlyPlayers,
    games: inferredOnlyGames,
    samples: buildPlaystyleSamples(inferredOnlyPlayers, inferredOnlyGames),
  });

  assert.equal(profile.hasData, true);
  assert.equal(profile.assistContext.importHealthLabel, "Partial assist inference");
}

{
  const noAssistPlayers = [
    { id: "a", name: "Astra" },
    { id: "b", name: "Bolt" },
    { id: "c", name: "Comet" },
  ];
  const noAssistGames = [
    {
      id: "na-1",
      winnerId: "a",
      players: [{ id: "a" }, { id: "b" }, { id: "c" }],
      totals: {
        a: { totalPrestige: 5, directPrestige: 5, assistPrestigeReceived: 0 },
        b: { totalPrestige: 4, directPrestige: 4, assistPrestigeReceived: 0 },
        c: { totalPrestige: 3, directPrestige: 3, assistPrestigeReceived: 0 },
      },
      rounds: [
        { playerId: "a", prestige: 2, contracts: 1, failures: 0 },
        { playerId: "b", prestige: 2, contracts: 1, failures: 0 },
        { playerId: "c", prestige: 3, contracts: 1, failures: 0 },
      ],
    },
    {
      id: "na-2",
      winnerId: "b",
      players: [{ id: "a" }, { id: "b" }, { id: "c" }],
      totals: {
        a: { totalPrestige: 1, directPrestige: 1, assistPrestigeReceived: 0 },
        b: { totalPrestige: 6, directPrestige: 6, assistPrestigeReceived: 0 },
        c: { totalPrestige: 2, directPrestige: 2, assistPrestigeReceived: 0 },
      },
      rounds: [
        { playerId: "a", prestige: 1, contracts: 1, failures: 0 },
        { playerId: "b", prestige: 3, contracts: 1, failures: 0 },
        { playerId: "c", prestige: 2, contracts: 1, failures: 0 },
      ],
    },
    {
      id: "na-3",
      winnerId: "c",
      players: [{ id: "a" }, { id: "b" }, { id: "c" }],
      totals: {
        a: { totalPrestige: 2, directPrestige: 2, assistPrestigeReceived: 0 },
        b: { totalPrestige: 1, directPrestige: 1, assistPrestigeReceived: 0 },
        c: { totalPrestige: 5, directPrestige: 5, assistPrestigeReceived: 0 },
      },
      rounds: [
        { playerId: "a", prestige: 2, contracts: 1, failures: 0 },
        { playerId: "b", prestige: 1, contracts: 1, failures: 0 },
        { playerId: "c", prestige: 5, contracts: 1, failures: 0 },
      ],
    },
  ];

  const profile = buildMoonrakersIntelProfile({
    playerId: "a",
    players: noAssistPlayers,
    games: noAssistGames,
    samples: buildPlaystyleSamples(noAssistPlayers, noAssistGames),
  });

  assert.equal(profile.hasData, true);
  assert.equal(profile.assistContext.importHealthLabel, "No assist context");
}

{
  const profileSource = read(path.join("app", "player-profile", "[playerId].tsx"));
  assert.match(profileSource, /MoonrakersIntelSection/);
  assert.match(profileSource, /<MoonrakersIntelSection profile=\{moonrakersIntel as any\} \/>/);

  const componentSource = read(path.join("components", "player", "MoonrakersIntelSection.tsx"));
  assert.match(componentSource, /Moonrakers Intel/);
  assert.match(componentSource, /Playstyle/);
  assert.match(componentSource, /Best Condition/);
  assert.match(componentSource, /Worst Condition/);
  assert.match(componentSource, /Base Discipline/);
  assert.match(componentSource, /Objective Profile/);
  assert.match(componentSource, /Objective Prestige \/ Game/);
  assert.match(componentSource, /Games scoring any objective prestige/);
  assert.match(componentSource, /Wins without objective prestige/);
  assert.match(componentSource, /Games with 2\+ objective prestige/);
  assert.doesNotMatch(componentSource, /Objective Pts \/ Game/);
  assert.doesNotMatch(componentSource, /objective points/);
  assert.match(componentSource, /Support Profile/);
  assert.match(componentSource, /Assist Received \/ Game/);
  assert.match(componentSource, /Assists Received \/ Game/);
  assert.doesNotMatch(componentSource, /Assist Rec \/ Game/);
  assert.doesNotMatch(componentSource, /Assists Rec \/ Game/);
  assert.match(componentSource, /Assist Context/);
  assert.match(componentSource, /Assist Gap to Target/);
  assert.match(componentSource, /Assist Gap to Leader/);
  assert.match(componentSource, /Assists at 6\+ Prestige/);
  assert.match(componentSource, /Assists Over 5 Behind Leader/);
  assert.match(componentSource, /Assist Prestige Gained/);
  assert.match(componentSource, /Import Health/);
  assert.match(componentSource, /buildDefinitionsRoute/);
  assert.match(componentSource, /router\.push\(buildDefinitionsRoute\(metricKey\)\)/);
}

console.log("player-profile-moonrakers.test.cjs passed");
