import assert from "node:assert/strict";

import { buildDraftFromLegacyActiveGame } from "../lib/game-draft/buildDraftFromLegacyActiveGame.ts";
import { buildCompletedGamePayload } from "../lib/game-save/buildCompletedGamePayload.ts";
import { isUuid } from "../lib/ids/uuid.ts";

const emptyCurrent = {
  prestige: 0,
  contracts: 0,
  failures: 0,
  assistRecipients: {},
  assistPrestigeRecipients: {},
  objectiveCount: 0,
  headToHeadFirstPlaceId: null,
  headToHeadSecondPlaceId: null,
};

const legacyDraft = buildDraftFromLegacyActiveGame({
  profileId: "host-profile",
  activeGame: {
    id: "1780478629138",
    players: [
      { id: "player-1", name: "Izzy", startOrder: 0 },
      { id: "player-2", name: "Greg", startOrder: 1 },
    ],
    turnIndex: 0,
    rounds: [],
    totals: {},
    current: emptyCurrent,
    createdAt: 1700000000000,
    roundCount: 0,
  },
});

assert.ok(
  isUuid(legacyDraft.draftId),
  "expected legacy active-game conversion to upgrade timestamp ids to UUIDs",
);

const validClientGameId = "11111111-1111-4111-8111-111111111111";
const validPayload = buildCompletedGamePayload({
  hostProfileId: "host-profile",
  activeGame: {
    id: validClientGameId,
    players: [],
    rounds: [],
    totals: {},
  },
  winnerId: null,
});

assert.equal(
  validPayload.client_game_id,
  validClientGameId,
  "expected finish payloads to forward valid UUID game ids for idempotent saves",
);

const invalidPayload = buildCompletedGamePayload({
  hostProfileId: "host-profile",
  activeGame: {
    id: "1780478629138",
    players: [],
    rounds: [],
    totals: {},
  },
  winnerId: null,
});

assert.ok(
  !("client_game_id" in invalidPayload),
  "expected finish payloads to omit invalid legacy timestamp ids from client_game_id",
);

console.log("game-sync-id.test.ts passed");
