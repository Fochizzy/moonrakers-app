import assert from "node:assert/strict";

import { resolveDraftResumeRoute } from "../lib/game-draft/phase.ts";
import { buildActiveGameProjection } from "../lib/game-draft/buildActiveGameProjection.ts";
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

console.log("game-draft-domain.test.ts passed");
