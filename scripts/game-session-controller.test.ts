import assert from "node:assert/strict";

import {
  buildSubmitRoundCandidate,
  prepareFinishGameState,
} from "../lib/game-session/gameSessionController.ts";

function main() {
  const candidate = buildSubmitRoundCandidate({
    activeTurnPlayerId: "captain-1",
    current: {
      prestige: 3,
      contracts: 1,
      failures: 0,
      assistRecipients: { "captain-2": 1, "captain-3": 0 },
      assistPrestigeRecipients: { "captain-2": 2, "captain-3": 5 },
      objectiveCount: 0,
    },
    existingRounds: [],
    objectiveAwardsByPlayer: {
      "captain-2": 2,
      "captain-3": 0,
    },
    now: () => 1700000000000,
    createRoundId: (playerId, createdAt) => `${playerId}-${createdAt}`,
  });

  assert.equal(candidate.mainRound.playerId, "captain-1");
  assert.deepEqual(candidate.mainRound.assistRecipients, { "captain-2": 1 });
  assert.deepEqual(candidate.mainRound.assistPrestigeRecipients, { "captain-2": 2 });
  assert.equal(candidate.nextRounds.length, 2, "expected one main round plus one objective bonus round");
  assert.equal(candidate.nextRounds[1]?.linkedTurnId, candidate.mainRound.id);
  assert.equal(candidate.nextRounds[1]?.objectiveCount, 2);

  const finishState = prepareFinishGameState({
    activeGame: {
      id: "game-1",
      groupId: "group-1",
      groupName: "Fleet Night",
      players: [
        { id: "captain-1", name: "Alex" },
        { id: "captain-2", name: "Bri" },
      ],
      totals: {},
      rounds: candidate.nextRounds,
      roundCount: candidate.nextRounds.length,
      turnIndex: 1,
      current: {
        prestige: 0,
        contracts: 0,
        failures: 0,
        assistRecipients: {},
        assistPrestigeRecipients: {},
        objectiveCount: 0,
      },
      createdAt: 1700000000000,
    },
    players: [
      { id: "captain-1", name: "Alex", color: "#123456" },
      { id: "captain-2", name: "Bri", color: "#abcdef" },
    ],
    rounds: candidate.nextRounds,
    winnerId: "captain-1",
  });

  assert.equal(finishState.winnerId, "captain-1");
  assert.equal(finishState.cloudGame.players.length, 2);
  assert.equal(finishState.cloudGame.rounds.length, 2);
}

try {
  main();
  console.log("game-session-controller.test.ts passed");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
