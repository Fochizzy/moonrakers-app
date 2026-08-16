const assert = require("node:assert/strict");

require("./support/ts-require.cjs");

const { buildUndoLastTurnCandidate } = require("../lib/game-session/undoLastTurn.ts");
const { buildTotals } = require("../engine/gameEngine.ts");

const players = [
  { id: "p1", name: "Izzy" },
  { id: "p2", name: "Greg" },
  { id: "p3", name: "Corey" },
];
const playerIds = players.map((player) => player.id);

function mainRound(id, playerId, prestige, createdAt) {
  return {
    id,
    playerId,
    prestige,
    contracts: 1,
    failures: 0,
    assistRecipients: {},
    assistPrestigeRecipients: {},
    objectiveCount: 0,
    objectivePrestige: 0,
    createdAt,
    metaType: "main",
  };
}

// Nothing saved yet -> nothing to undo.
assert.equal(
  buildUndoLastTurnCandidate({ existingRounds: [], turnIndex: 0, playerIds }),
  null,
  "expected no undo candidate when no turns are saved",
);

// A saved turn plus its linked bonus round come out together.
const rounds = [
  mainRound("r1", "p1", 5, 1000),
  mainRound("r2", "p2", 3, 2000),
  {
    ...mainRound("r2-bonus", "p3", 0, 2001),
    metaType: "bonusObjective",
    linkedTurnId: "r2",
    objectiveCount: 2,
    objectivePrestige: 2,
  },
];

const candidate = buildUndoLastTurnCandidate({
  existingRounds: rounds,
  turnIndex: 2,
  playerIds,
});

assert.ok(candidate, "expected an undo candidate for a saved turn");
assert.equal(candidate.removedRound.id, "r2", "expected the latest main round to be removed");
assert.equal(
  candidate.removedLinkedRounds.length,
  1,
  "expected the linked bonus round to be removed with its turn",
);
assert.deepEqual(
  candidate.nextRounds.map((round) => round.id),
  ["r1"],
  "expected only the earlier turn to survive the undo",
);
assert.equal(
  candidate.nextTurnIndex,
  1,
  "expected the turn to be handed back to the seat that played it",
);

// Undoing must leave totals matching a game where that turn never happened.
const undoneTotals = buildTotals(candidate.nextRounds, players);
const neverPlayedTotals = buildTotals([rounds[0]], players);
assert.deepEqual(
  undoneTotals,
  neverPlayedTotals,
  "expected totals after undo to match totals for a game without that turn",
);

// A player who has since left the roster falls back to stepping one seat back.
const orphanedCandidate = buildUndoLastTurnCandidate({
  existingRounds: [mainRound("r9", "gone", 4, 9000)],
  turnIndex: 0,
  playerIds,
});
assert.equal(
  orphanedCandidate.nextTurnIndex,
  2,
  "expected the seat index to wrap back to the last seat",
);

console.log("undo-last-turn.test.cjs passed");
