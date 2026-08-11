import assert from "node:assert/strict";

import { resolveDraftResumeRoute } from "../lib/game-draft/phase.ts";
import { buildActiveGameProjection } from "../lib/game-draft/buildActiveGameProjection.ts";
import { buildDraftFromLegacyActiveGame } from "../lib/game-draft/buildDraftFromLegacyActiveGame.ts";
import { isUuid } from "../lib/ids/uuid.ts";
import type { GameDraft } from "../lib/game-draft/types.ts";

const sampleDraft: GameDraft = {
  profileId: "captain-1",
  draftId: "draft-1",
  phase: "in_progress",
  revision: 3,
  updatedAt: 1716650000000,
  deviceUpdatedAt: 1716650000500,
  selectedPlayerIds: ["captain-1", "captain-2", "captain-3"],
  selectedGroupId: "group-1",
  selectedGroupName: "Night Shift",
  turnOrder: ["captain-2", "captain-1", "captain-3"],
  playerSnapshots: [
    {
      id: "captain-1",
      name: "Nova",
      color: "#60A5FA",
      initials: "NO",
      assignedCardArtIndex: 0,
    },
    {
      id: "captain-2",
      name: "Pike",
      color: "#F472B6",
      initials: "PI",
      assignedCardArtIndex: 1,
    },
    {
      id: "captain-3",
      name: "Rune",
      color: "#34D399",
      initials: "RU",
      assignedCardArtIndex: 2,
    },
  ],
  gameplay: {
    turnIndex: 1,
    rounds: [],
    totals: {},
    current: {
      prestige: 4,
      contracts: 1,
      failures: 0,
      assistRecipients: {},
      assistPrestigeRecipients: {},
      objectiveCount: 0,
    },
    roundCount: 2,
    selectedWinnerId: null,
  },
};

assert.equal(resolveDraftResumeRoute("player_selection"), "/");
assert.equal(resolveDraftResumeRoute("setup"), "/game-setup");
assert.equal(resolveDraftResumeRoute("in_progress"), "/game");
assert.equal(resolveDraftResumeRoute("ready_to_finish"), "/game");

const projected = buildActiveGameProjection(sampleDraft);
assert.equal(projected.players[0].id, "captain-2");
assert.equal(projected.turnIndex, 1);
assert.equal(projected.groupId, "group-1");
assert.equal(projected.groupName, "Night Shift");
assert.equal(projected.current.prestige, 4);

const legacyActiveGame = {
  id: "legacy-active-1",
  players: [
    {
      id: "captain-2",
      name: "Pike",
      initials: "PI",
      color: "#F472B6",
      assignedCardArtIndex: 1,
      startOrder: 0,
    },
    {
      id: "captain-1",
      name: "Nova",
      initials: "NO",
      color: "#60A5FA",
      assignedCardArtIndex: 0,
      startOrder: 1,
    },
  ],
  turnIndex: 1,
  rounds: [
    {
      id: "round-1",
      playerId: "captain-2",
      prestige: 3,
      contracts: 1,
      failures: 0,
      assistRecipients: {},
      assistPrestigeRecipients: {},
      objectiveCount: 1,
      objectivePrestige: 1,
      createdAt: 1716651000000,
    },
  ],
  totals: {
    "captain-2": {
      totalPrestige: 4,
      directPrestige: 3,
      objectivePrestige: 1,
      score: 4,
      assists: 0,
      failures: 0,
      contracts: 1,
    },
  },
  current: {
    prestige: 2,
    contracts: 1,
    failures: 0,
    assistRecipients: {},
    assistPrestigeRecipients: {},
    objectiveCount: 0,
    headToHeadFirstPlaceId: null,
    headToHeadSecondPlaceId: null,
  },
  createdAt: 1716650000000,
  groupId: "group-1",
  groupName: "Night Shift",
  selectedWinnerId: "captain-2",
  roundCount: 1,
};

const convertedDraft = buildDraftFromLegacyActiveGame({
  profileId: "captain-1",
  activeGame: legacyActiveGame,
  now: 1716652000000,
});

assert.equal(convertedDraft.profileId, "captain-1");
assert.ok(
  isUuid(convertedDraft.draftId),
  "expected the legacy timestamp id to be upgraded to a UUID draft id",
);

// Converting the same legacy game twice must resolve to the same draftId:
// activeGame.id is reprojected from the draft and feeds the client_game_id
// finish-idempotency key, so a fresh random id each call would duplicate saves.
const reconvertedDraft = buildDraftFromLegacyActiveGame({
  profileId: "captain-1",
  activeGame: legacyActiveGame,
  now: 1716653000000,
});

assert.equal(reconvertedDraft.draftId, convertedDraft.draftId);
assert.notEqual(
  buildDraftFromLegacyActiveGame({
    profileId: "captain-1",
    activeGame: { ...legacyActiveGame, id: "legacy-active-2" },
    now: 1716652000000,
  }).draftId,
  convertedDraft.draftId,
);
assert.equal(convertedDraft.phase, "in_progress");
assert.deepEqual(convertedDraft.selectedPlayerIds, ["captain-2", "captain-1"]);
assert.deepEqual(convertedDraft.turnOrder, ["captain-2", "captain-1"]);
assert.equal(convertedDraft.selectedGroupId, "group-1");
assert.equal(convertedDraft.selectedGroupName, "Night Shift");
assert.equal(convertedDraft.gameplay?.turnIndex, 1);
assert.equal(convertedDraft.gameplay?.roundCount, 1);
assert.equal(convertedDraft.gameplay?.selectedWinnerId, "captain-2");
assert.notEqual(convertedDraft.gameplay?.rounds, legacyActiveGame.rounds);
assert.notEqual(convertedDraft.gameplay?.totals, legacyActiveGame.totals);

console.log("game-draft-domain.test.ts passed");
