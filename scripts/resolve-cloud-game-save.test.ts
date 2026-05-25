import assert from "node:assert/strict";

import { resolveCloudGameSaveState } from "../lib/game-save/resolveCloudGameSave.ts";

const GREG_ID = "11111111-1111-4111-8111-111111111111";
const IZZY_ID = "22222222-2222-4222-8222-222222222222";
const FRIDAY_CREW_ID = "33333333-3333-4333-8333-333333333333";

const playerDirectory = [
  { id: GREG_ID, name: "Greg", color: "green", assignedCardArtIndex: 2 },
  { id: IZZY_ID, name: "Izzy", color: "purple", assignedCardArtIndex: 4 },
];

const exactGroupMatch = resolveCloudGameSaveState({
  activeGame: {
    id: "game-1",
    groupId: "local-group",
    groupName: "Friday Crew",
    players: [
      { id: "local-greg", name: "Greg", color: "green", startOrder: 0 },
      { id: IZZY_ID, name: "Izzy", color: "purple", startOrder: 1 },
    ],
    totals: {
      "local-greg": { score: 14, totalPrestige: 14, directPrestige: 11 },
      [IZZY_ID]: { score: 9, totalPrestige: 9, directPrestige: 7 },
    },
    rounds: [
      {
        id: "round-1",
        playerId: "local-greg",
        prestige: 5,
        contracts: 1,
        failures: 0,
        assistRecipients: { [IZZY_ID]: 1 },
        assistPrestigeRecipients: { [IZZY_ID]: 3 },
        objectiveCount: 0,
        objectivePrestige: 0,
        createdAt: 1,
      },
    ],
  },
  winnerId: "local-greg",
  playerDirectory,
  groupDirectory: [
    {
      id: FRIDAY_CREW_ID,
      name: "Friday Crew",
      playerIds: [GREG_ID, IZZY_ID],
    },
  ],
});

assert.deepEqual(
  exactGroupMatch.unresolvedPlayerNames,
  [],
  "expected exact registered-name matches to resolve local active-game players",
);
assert.equal(
  exactGroupMatch.winnerId,
  GREG_ID,
  "expected the winner id to be remapped onto the registered profile id",
);
assert.equal(
  exactGroupMatch.activeGame.groupId,
  FRIDAY_CREW_ID,
  "expected local group ids to resolve onto a matching shared Supabase group",
);
assert.equal(
  exactGroupMatch.createGroupRequest,
  null,
  "expected no new shared group creation when an exact cloud group already exists",
);
assert.deepEqual(
  exactGroupMatch.activeGame.players.map((player) => player.id),
  [GREG_ID, IZZY_ID],
  "expected active-game players to be remapped to registered profile ids",
);
assert.equal(
  exactGroupMatch.activeGame.totals?.[GREG_ID]?.score,
  14,
  "expected totals to follow the remapped registered player ids",
);
assert.equal(
  exactGroupMatch.activeGame.rounds?.[0]?.playerId,
  GREG_ID,
  "expected saved rounds to follow the remapped registered player ids",
);

const needsGroupCreation = resolveCloudGameSaveState({
  activeGame: {
    id: "game-2",
    groupId: "local-group-2",
    groupName: "Saturday Crew",
    players: [
      { id: "local-greg", name: "Greg", startOrder: 0 },
      { id: IZZY_ID, name: "Izzy", startOrder: 1 },
    ],
    totals: {},
    rounds: [],
  },
  winnerId: IZZY_ID,
  playerDirectory,
  groupDirectory: [],
});

assert.deepEqual(
  needsGroupCreation.createGroupRequest,
  {
    name: "Saturday Crew",
    playerIds: [GREG_ID, IZZY_ID],
  },
  "expected unresolved local group ids to request a new shared Supabase group",
);

const unresolvedPlayer = resolveCloudGameSaveState({
  activeGame: {
    id: "game-3",
    players: [
      { id: "local-corey", name: "Corey", startOrder: 0 },
      { id: IZZY_ID, name: "Izzy", startOrder: 1 },
    ],
    totals: {},
    rounds: [],
  },
  winnerId: IZZY_ID,
  playerDirectory,
  groupDirectory: [],
});

assert.deepEqual(
  unresolvedPlayer.unresolvedPlayerNames,
  ["Corey"],
  "expected unresolved legacy local players to be surfaced before the finish RPC runs",
);

console.log("resolve-cloud-game-save.test.ts passed");
