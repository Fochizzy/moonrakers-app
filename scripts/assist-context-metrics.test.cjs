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
  buildAssistContextEvents,
  buildAssistContextGameSamples,
} = require("../utils/assistContextMetrics.ts");

const games = [
  {
    id: "g-1",
    winnerId: "a",
    players: [{ id: "a" }, { id: "b" }, { id: "c" }],
    rounds: [
      {
        playerId: "a",
        prestige: 3,
        assistRecipients: { b: 1 },
        assistPrestigeRecipients: { b: 2 },
      },
      {
        playerId: "b",
        prestige: 3,
        assistRecipients: { a: 2 },
        assistPrestigeRecipients: { a: 4 },
      },
      {
        playerId: "c",
        prestige: 4,
        assistRecipients: {},
        assistPrestigeRecipients: {},
      },
      {
        playerId: "a",
        prestige: 1,
        assistRecipients: { c: 1, b: 1 },
        assistPrestigeRecipients: { c: 3, b: 1 },
      },
      {
        playerId: "a",
        prestige: 2,
        assistRecipients: {},
        assistPrestigeRecipients: {},
        metaType: "bonusObjective",
      },
      {
        playerId: "a",
        prestige: 0,
        assistRecipients: { b: 1 },
        assistPrestigeRecipients: { b: 2 },
      },
    ],
  },
  {
    id: "g-2",
    winnerId: "e",
    players: [{ id: "d" }, { id: "e" }, { id: "f" }],
    rounds: [
      { playerId: "d", prestige: 6, assistRecipients: {}, assistPrestigeRecipients: {} },
      {
        playerId: "e",
        prestige: 1,
        assistRecipients: { f: 1 },
        assistPrestigeRecipients: { f: 2 },
      },
    ],
  },
  {
    id: "g-3",
    winnerId: "g",
    players: [{ id: "g" }, { id: "h" }],
    rounds: [
      { playerId: "g", prestige: 1, assistRecipients: {}, assistPrestigeRecipients: {} },
      { playerId: "h", prestige: 2, assistRecipients: {}, assistPrestigeRecipients: {} },
    ],
  },
  {
    id: "g-4",
    winnerId: "i",
    players: [{ id: "i" }, { id: "j" }],
    rounds: [{ playerId: "i", prestige: 3 }],
  },
  {
    id: "g-5",
    winnerId: "l",
    players: [{ id: "k" }, { id: "l" }],
    totals: {
      k: {
        totalPrestige: 2,
        directPrestige: 2,
        assistPrestigeReceived: 0,
        assistPrestigeBySource: {},
        assistCountBySource: {},
      },
      l: {
        totalPrestige: 7,
        directPrestige: 3,
        assistPrestigeReceived: 4,
        assistPrestigeBySource: { k: 4 },
        assistCountBySource: { k: 2 },
      },
    },
    rounds: [
      { playerId: "l", prestige: 2, assistRecipients: { k: 1 } },
      { playerId: "l", prestige: 1, assistRecipients: { k: 1 } },
    ],
  },
  {
    id: "g-6",
    winnerId: "m",
    players: [{ id: "m" }, { id: "n" }],
    totals: {
      m: {
        totalPrestige: 1,
        directPrestige: 1,
        assistPrestigeReceived: 0,
        assistPrestigeBySource: {},
        assistCountBySource: {},
      },
      n: {
        totalPrestige: 6,
        directPrestige: 3,
        assistPrestigeReceived: 3,
        assistPrestigeBySource: { m: 3 },
        assistCountBySource: { m: 1 },
      },
    },
    rounds: [{ playerId: "n", prestige: 3 }],
  },
];

{
  const events = buildAssistContextEvents(games);

  assert.equal(events.length, 9);

  const aEvents = events
    .filter((event) => event.gameId === "g-1" && event.assisterId === "a")
    .map((event) => ({
      targetId: event.targetId,
      gapToTarget: event.gapToTarget,
      gapToLeader: event.gapToLeader,
      countedAsSixPlus: event.countedAsSixPlus,
      countedWhileFiveBehindLeader: event.countedWhileFiveBehindLeader,
      assistPrestigeGained: event.assistPrestigeGained,
    }));

  assert.deepEqual(aEvents, [
    {
      targetId: "b",
      gapToTarget: 1,
      gapToLeader: 0,
      countedAsSixPlus: 0,
      countedWhileFiveBehindLeader: 0,
      assistPrestigeGained: 2,
    },
    {
      targetId: "b",
      gapToTarget: 1,
      gapToLeader: 0,
      countedAsSixPlus: 0,
      countedWhileFiveBehindLeader: 0,
      assistPrestigeGained: 2,
    },
  ]);

  const bEvents = events
    .filter((event) => event.gameId === "g-1" && event.assisterId === "b")
    .map((event) => ({
      targetId: event.targetId,
      gapToTarget: event.gapToTarget,
      gapToLeader: event.gapToLeader,
      countedAsSixPlus: event.countedAsSixPlus,
      assistPrestigeGained: event.assistPrestigeGained,
    }));

  assert.deepEqual(bEvents, [
    { targetId: "a", gapToTarget: 0, gapToLeader: 0, countedAsSixPlus: 0, assistPrestigeGained: 2 },
    { targetId: "a", gapToTarget: 2, gapToLeader: 2, countedAsSixPlus: 0, assistPrestigeGained: 1 },
    { targetId: "a", gapToTarget: 4, gapToLeader: 4, countedAsSixPlus: 1, assistPrestigeGained: 2 },
  ]);

  const fiveBehindEvent = events.find((event) => event.gameId === "g-2");
  assert.deepEqual(
    {
      assisterId: fiveBehindEvent.assisterId,
      targetId: fiveBehindEvent.targetId,
      preAssistPrestige: fiveBehindEvent.preAssistPrestige,
      leaderPrestige: fiveBehindEvent.leaderPrestige,
      gapToTarget: fiveBehindEvent.gapToTarget,
      gapToLeader: fiveBehindEvent.gapToLeader,
      countedWhileFiveBehindLeader: fiveBehindEvent.countedWhileFiveBehindLeader,
      assistPrestigeGained: fiveBehindEvent.assistPrestigeGained,
    },
    {
      assisterId: "f",
      targetId: "e",
      preAssistPrestige: 0,
      leaderPrestige: 6,
      gapToTarget: 0,
      gapToLeader: 6,
      countedWhileFiveBehindLeader: 1,
      assistPrestigeGained: 2,
    },
  );

  const inferredEvents = events
    .filter((event) => event.gameId === "g-5" && event.assisterId === "k")
    .map((event) => ({
      targetId: event.targetId,
      gapToTarget: event.gapToTarget,
      gapToLeader: event.gapToLeader,
      assistPrestigeGained: event.assistPrestigeGained,
    }));

  assert.deepEqual(inferredEvents, [
    {
      targetId: "l",
      gapToTarget: 0,
      gapToLeader: 0,
      assistPrestigeGained: 2,
    },
    {
      targetId: "l",
      gapToTarget: 0,
      gapToLeader: 0,
      assistPrestigeGained: 2,
    },
  ]);
}

{
  const samples = buildAssistContextGameSamples(games);

  const alphaGame = samples.find(
    (sample) => sample.gameId === "g-1" && sample.playerId === "b",
  );
  assert.deepEqual(alphaGame, {
    gameId: "g-1",
    playerId: "b",
    assistCount: 3,
    avgGapToTarget: 2,
    avgGapToLeader: 2,
    assistsAtSixPlus: 1,
    assistsWhileFiveBehindLeader: 0,
    totalAssistPrestigeGained: 5,
    winFlag: 0,
    hasTrackedAssistContext: true,
  });

  const zeroAssistTracked = samples.find(
    (sample) => sample.gameId === "g-3" && sample.playerId === "g",
  );
  assert.deepEqual(zeroAssistTracked, {
    gameId: "g-3",
    playerId: "g",
    assistCount: 0,
    avgGapToTarget: null,
    avgGapToLeader: null,
    assistsAtSixPlus: 0,
    assistsWhileFiveBehindLeader: 0,
    totalAssistPrestigeGained: 0,
    winFlag: 1,
    hasTrackedAssistContext: true,
  });

  assert.equal(
    samples.some((sample) => sample.gameId === "g-4"),
    false,
    "expected games without tracked assist direction to be skipped",
  );

  const inferredOnlySample = samples.find(
    (sample) => sample.gameId === "g-6" && sample.playerId === "m",
  );
  assert.deepEqual(inferredOnlySample, {
    gameId: "g-6",
    playerId: "m",
    assistCount: 1,
    avgGapToTarget: null,
    avgGapToLeader: null,
    assistsAtSixPlus: 0,
    assistsWhileFiveBehindLeader: 0,
    totalAssistPrestigeGained: 3,
    winFlag: 1,
    hasTrackedAssistContext: false,
  });
}

console.log("assist-context-metrics.test.cjs passed");
