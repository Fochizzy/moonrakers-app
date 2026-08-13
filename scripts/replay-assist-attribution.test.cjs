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
  buildReplayAssistLedger,
  buildReplayAssistSummary,
  getReplaySnapshotEntry,
  groupReplayAssistLedgerByHelper,
} = require("../utils/replayAssists.ts");

// Assisters and their prestige come from the per-turn recipient maps.
const mainTurn = buildReplayAssistSummary({
  playerId: "greg",
  prestige: 6,
  assistRecipients: { izzy: 1, corey: 1, greg: 0 },
  assistPrestigeRecipients: { izzy: 2, corey: 5, greg: 0 },
});

assert.deepEqual(
  mainTurn.shares,
  [
    { playerId: "corey", prestige: 5 },
    { playerId: "izzy", prestige: 2 },
  ],
  "expected assisting players sorted by prestige gained, actor excluded",
);
assert.equal(mainTurn.assistCount, 2, "expected one entry per assisting player");
assert.equal(
  mainTurn.assistPrestige,
  7,
  "expected the turn total to sum the prestige awarded to assisters",
);

// A flagged assist that earned nothing still names the helper.
const zeroPrestigeAssist = buildReplayAssistSummary({
  playerId: "greg",
  assistRecipients: { izzy: 1 },
  assistPrestigeRecipients: { izzy: 0 },
});

assert.deepEqual(
  zeroPrestigeAssist.shares,
  [{ playerId: "izzy", prestige: 0 }],
  "expected a flagged assist with no prestige to still be attributed",
);
assert.equal(zeroPrestigeAssist.assistCount, 1);
assert.equal(zeroPrestigeAssist.assistPrestige, 0);

// Prestige recorded without the flag is still credited, matching buildTotals.
const prestigeWithoutFlag = buildReplayAssistSummary({
  playerId: "greg",
  assistRecipients: {},
  assistPrestigeRecipients: { izzy: 3 },
});

assert.deepEqual(
  prestigeWithoutFlag.shares,
  [{ playerId: "izzy", prestige: 3 }],
  "expected assist prestige without a recipient flag to still be attributed",
);

// Players with neither a flag nor prestige are omitted.
const emptyRecipients = buildReplayAssistSummary({
  playerId: "greg",
  assistRecipients: { izzy: 0, corey: 0 },
  assistPrestigeRecipients: { izzy: 0, corey: 0 },
});

assert.deepEqual(
  emptyRecipients.shares,
  [],
  "expected untouched recipient slots to be omitted",
);
assert.equal(emptyRecipients.assistCount, 0);
assert.equal(emptyRecipients.assistPrestige, 0);

// Linked bonus/head-to-head entries never award assists.
for (const metaType of [
  "bonusObjective",
  "headToHeadFirstPlace",
  "headToHeadSecondPlace",
]) {
  const linked = buildReplayAssistSummary({
    playerId: "greg",
    metaType,
    assistRecipients: { izzy: 1 },
    assistPrestigeRecipients: { izzy: 4 },
  });

  assert.deepEqual(
    linked.shares,
    [],
    `expected ${metaType} turns to report no assists`,
  );
  assert.equal(linked.assistCount, 0);
  assert.equal(linked.assistPrestige, 0);
}

// Imported turns without recipient maps fall back to scalar totals.
const legacyTurn = buildReplayAssistSummary({
  playerId: "greg",
  assists: 2,
  assistPrestigeSent: 6,
});

assert.deepEqual(
  legacyTurn.shares,
  [],
  "expected legacy turns to expose no per-player attribution",
);
assert.equal(legacyTurn.assistCount, 2);
assert.equal(legacyTurn.assistPrestige, 6);

assert.deepEqual(
  buildReplayAssistSummary(undefined),
  { shares: [], assistCount: 0, assistPrestige: 0 },
  "expected a missing turn to be handled safely",
);

// --- Snapshot ledger (GameReplay round-by-round view) ---

const playerIds = ["greg", "izzy", "corey"];

const firstStep = {
  greg: { assistPrestigeBySource: {}, assistCountBySource: {} },
  izzy: {
    assistPrestigeBySource: { greg: 2 },
    assistCountBySource: { greg: 1 },
  },
  corey: {
    assistPrestigeBySource: { greg: 5 },
    assistCountBySource: { greg: 1 },
  },
};

const openingLedger = buildReplayAssistLedger({
  playerIds,
  snapshot: firstStep,
});

assert.deepEqual(
  openingLedger,
  [
    { helperId: "corey", actorId: "greg", prestige: 5, assists: 1 },
    { helperId: "izzy", actorId: "greg", prestige: 2, assists: 1 },
  ],
  "expected the first step to attribute every assist against an empty baseline",
);

// Cumulative snapshots: only the change since the previous step is this round's work.
const secondStep = {
  greg: {
    assistPrestigeBySource: { izzy: 4 },
    assistCountBySource: { izzy: 1 },
  },
  izzy: {
    assistPrestigeBySource: { greg: 2 },
    assistCountBySource: { greg: 1 },
  },
  corey: {
    assistPrestigeBySource: { greg: 5, izzy: 3 },
    assistCountBySource: { greg: 1, izzy: 1 },
  },
};

const stepLedger = buildReplayAssistLedger({
  playerIds,
  snapshot: secondStep,
  previousSnapshot: firstStep,
});

assert.deepEqual(
  stepLedger,
  [
    { helperId: "greg", actorId: "izzy", prestige: 4, assists: 1 },
    { helperId: "corey", actorId: "izzy", prestige: 3, assists: 1 },
  ],
  "expected only the prestige gained since the previous snapshot to be reported",
);

assert.deepEqual(
  groupReplayAssistLedgerByHelper(stepLedger),
  {
    greg: {
      prestige: 4,
      assists: 1,
      partners: [{ actorId: "izzy", prestige: 4, assists: 1 }],
    },
    corey: {
      prestige: 3,
      assists: 1,
      partners: [{ actorId: "izzy", prestige: 3, assists: 1 }],
    },
  },
  "expected per-helper rollups to keep each assisted player and its prestige",
);

// A round where nobody assisted reports nothing rather than repeating history.
assert.deepEqual(
  buildReplayAssistLedger({
    playerIds,
    snapshot: secondStep,
    previousSnapshot: secondStep,
  }),
  [],
  "expected an unchanged snapshot to report no assists for the round",
);

// A zero-prestige assist still counts as an assist.
assert.deepEqual(
  buildReplayAssistLedger({
    playerIds: ["greg", "izzy"],
    snapshot: {
      izzy: {
        assistPrestigeBySource: { greg: 0 },
        assistCountBySource: { greg: 1 },
      },
    },
  }),
  [{ helperId: "izzy", actorId: "greg", prestige: 0, assists: 1 }],
  "expected an assist that earned no prestige to still be listed",
);

// Nested snapshot payloads resolve the same way as flat ones.
assert.deepEqual(
  buildReplayAssistLedger({
    playerIds: ["greg", "izzy"],
    snapshot: {
      players: {
        izzy: {
          assistPrestigeBySource: { greg: 6 },
          assistCountBySource: { greg: 1 },
        },
      },
    },
  }),
  [{ helperId: "izzy", actorId: "greg", prestige: 6, assists: 1 }],
  "expected nested { players: {...} } snapshots to resolve",
);

assert.equal(
  getReplaySnapshotEntry(undefined, "greg"),
  undefined,
  "expected a missing snapshot to be handled safely",
);

assert.deepEqual(
  buildReplayAssistLedger({ playerIds: [], snapshot: firstStep }),
  [],
  "expected an empty player list to report no assists",
);

const summarySource = fs.readFileSync(
  path.join(projectRoot, "app", "summary.tsx"),
  "utf8",
);

assert.match(
  summarySource,
  /buildReplayAssistSummary\(item\)/,
  "expected summary replay rows to derive assists from the shared attribution helper",
);

assert.match(
  summarySource,
  /Assisted By \(\{row\.assistShares\.length\}\)/,
  "expected the replay flow to name the assisting players for each turn",
);

assert.match(
  summarySource,
  /\+\{share\.prestige\}/,
  "expected each assisting player chip to show the prestige they gained",
);

const gameReplaySource = fs.readFileSync(
  path.join(projectRoot, "components", "GameReplay.tsx"),
  "utf8",
);

assert.match(
  gameReplaySource,
  /buildReplayAssistLedger\(\{/,
  "expected the game replay to derive round assists from the shared ledger helper",
);

assert.match(
  gameReplaySource,
  /Assists This Round/,
  "expected the game replay to surface the assists for the viewed round",
);

assert.match(
  gameReplaySource,
  /assisted \{nameById\[entry\.actorId\]/,
  "expected each ledger row to name the assisting player and who they assisted",
);

assert.match(
  gameReplaySource,
  /formatDelta\(entry\.prestige\)/,
  "expected each ledger row to show the prestige the assisting player gained",
);

console.log("replay-assist-attribution.test.cjs passed");
