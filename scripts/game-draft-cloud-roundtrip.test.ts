import assert from "node:assert/strict";

import { normalizeGameDraftRow } from "../lib/cloud/game-drafts/normalizeGameDraftRow.ts";

const restoredDraft = normalizeGameDraftRow({
  profile_id: "captain-1",
  draft_id: "draft-1",
  phase: "in_progress",
  revision: 7,
  updated_at: "2026-07-03T18:00:00.000Z",
  device_updated_at: "2026-07-03T18:00:01.000Z",
  payload: {
    selectedPlayerIds: ["captain-1", "captain-2", "captain-3"],
    selectedGroupId: "group-1",
    selectedGroupName: "Night Shift",
    turnOrder: ["captain-2", "captain-1", "captain-3"],
    playerSnapshots: [
      {
        id: "captain-1",
        name: "Nova",
        initials: "NO",
        color: "#60A5FA",
        assignedCardArtIndex: 0,
      },
      {
        id: "captain-2",
        name: "Pike",
        initials: "PI",
        color: "#F472B6",
        assignedCardArtIndex: 1,
      },
    ],
    gameplay: {
      turnIndex: 1,
      rounds: [],
      totals: {},
      current: {
        prestige: 0,
        contracts: 0,
        failures: 0,
        assistRecipients: {},
        assistPrestigeRecipients: {},
        objectiveCount: 0,
        headToHeadFirstPlaceId: "captain-2",
        headToHeadSecondPlaceId: "captain-1",
      },
      roundCount: 2,
      selectedWinnerId: null,
    },
  },
});

assert.ok(restoredDraft, "expected the cloud draft row to normalize into a draft");
assert.equal(
  restoredDraft?.gameplay?.current.headToHeadFirstPlaceId,
  "captain-2",
  "expected the first-place head-to-head selection to round-trip from the cloud payload",
);
assert.equal(
  restoredDraft?.gameplay?.current.headToHeadSecondPlaceId,
  "captain-1",
  "expected the second-place head-to-head selection to round-trip from the cloud payload",
);

console.log("game-draft-cloud-roundtrip.test.ts passed");
