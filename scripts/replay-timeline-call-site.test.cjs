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

const { buildReplayTimeline } = require("../utils/buildReplayTimeline.ts");
const {
  buildReplayAssistLedger,
} = require("../utils/replayAssists.ts");

const players = [
  { id: "greg", name: "Greg" },
  { id: "izzy", name: "Izzy" },
  { id: "corey", name: "Corey" },
];

const rounds = [
  {
    id: "t1",
    playerId: "greg",
    prestige: 4,
    contracts: 1,
    assistRecipients: { izzy: 1, corey: 1 },
    assistPrestigeRecipients: { izzy: 2, corey: 5 },
  },
  {
    id: "t2",
    playerId: "izzy",
    prestige: 3,
    contracts: 1,
    assistRecipients: { corey: 1 },
    assistPrestigeRecipients: { corey: 3 },
  },
  {
    id: "t2-bonus",
    playerId: "izzy",
    prestige: 0,
    objectiveCount: 2,
    metaType: "bonusObjective",
    linkedTurnId: "t2",
  },
  {
    id: "t3",
    playerId: "corey",
    prestige: 6,
    contracts: 1,
    assistRecipients: {},
    assistPrestigeRecipients: {},
  },
];

const timeline = buildReplayTimeline(rounds, players);

assert.equal(
  timeline.length,
  3,
  "expected linked bonus entries to fold into their turn instead of adding a step",
);
assert.deepEqual(
  timeline.map((step) => step.round),
  [1, 2, 3],
  "expected steps to be numbered consecutively",
);

// Snapshots are cumulative standings as of that step.
assert.equal(
  timeline[0].snapshot.greg.directPrestige,
  4,
  "expected the first step to hold only the first turn",
);
assert.equal(
  timeline[2].snapshot.greg.directPrestige,
  4,
  "expected earlier turns to persist into later steps",
);
assert.equal(
  timeline[2].snapshot.corey.directPrestige,
  6,
  "expected the last step to include the last turn",
);

// The folded bonus objective lands on step 2, not a step of its own.
assert.equal(
  timeline[1].snapshot.izzy.objectivePrestige,
  2,
  "expected a linked bonus objective to be credited to the turn it attaches to",
);

// Snapshots carry the assist attribution the replay renders.
assert.deepEqual(
  timeline[0].snapshot.corey.assistPrestigeBySource,
  { greg: 5 },
  "expected snapshots to record which player each assist was earned from",
);
assert.deepEqual(
  timeline[0].snapshot.corey.assistCountBySource,
  { greg: 1 },
  "expected snapshots to record the assist counts per source",
);

// End to end: the timeline feeds the ledger the replay renders per round.
const playerIds = players.map((player) => player.id);

assert.deepEqual(
  buildReplayAssistLedger({ playerIds, snapshot: timeline[0].snapshot }),
  [
    { helperId: "corey", actorId: "greg", prestige: 5, assists: 1 },
    { helperId: "izzy", actorId: "greg", prestige: 2, assists: 1 },
  ],
  "expected round 1 to report both players who assisted Greg and what they gained",
);

assert.deepEqual(
  buildReplayAssistLedger({
    playerIds,
    snapshot: timeline[1].snapshot,
    previousSnapshot: timeline[0].snapshot,
  }),
  [{ helperId: "corey", actorId: "izzy", prestige: 3, assists: 1 }],
  "expected round 2 to report only that round's assist",
);

assert.deepEqual(
  buildReplayAssistLedger({
    playerIds,
    snapshot: timeline[2].snapshot,
    previousSnapshot: timeline[1].snapshot,
  }),
  [],
  "expected an unassisted round to report nothing",
);

// Guards.
assert.deepEqual(buildReplayTimeline([], players), []);
assert.deepEqual(buildReplayTimeline(rounds, []), []);
assert.deepEqual(buildReplayTimeline(undefined, undefined), []);
assert.equal(
  buildReplayTimeline([{ prestige: 3 }, rounds[0]], players).length,
  1,
  "expected rounds without a player id to be skipped",
);

const gameTrendsSource = fs.readFileSync(
  path.join(projectRoot, "app", "game-trends.tsx"),
  "utf8",
);

assert.match(
  gameTrendsSource,
  /import GameReplay from "@\/components\/GameReplay"/,
  "expected game trends to mount the replay stepper",
);

assert.match(
  gameTrendsSource,
  /<GameReplay timeline=\{replayTimeline\} players=\{orderedPlayers\} \/>/,
  "expected the replay to be fed the built timeline and the seated players",
);

assert.match(
  gameTrendsSource,
  /buildReplayTimeline\(rounds, players\)/,
  "expected the replay timeline to be built from the saved game's rounds",
);

assert.match(
  gameTrendsSource,
  /scrollToSection\("replay"\)/,
  "expected the section nav to jump to the replay",
);

const tsconfig = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "tsconfig.json"), "utf8"),
);

for (const file of ["components/GameReplay.tsx", "components/ui/AnimatedCard.tsx"]) {
  assert.equal(
    tsconfig.exclude.includes(file),
    false,
    `expected ${file} to stay inside the typecheck now that it ships in a screen`,
  );
}

console.log("replay-timeline-call-site.test.cjs passed");
