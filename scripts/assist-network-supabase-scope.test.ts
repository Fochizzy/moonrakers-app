import assert from "node:assert/strict";

import { buildAssistNetworkDataset } from "../components/charts/AssistNetworkOverview/buildAssistNetworkDataset.ts";

const game = {
  id: "game-1",
  createdAt: 1,
  players: [
    { id: "p1", name: "Alpha" },
    { id: "p2", name: "Bravo" },
    { id: "p3", name: "Charlie" },
    { id: "p4", name: "Delta" },
    { id: "p5", name: "Echo" },
  ],
  totals: {},
  rounds: [
    {
      id: "round-1",
      playerId: "p1",
      prestige: 0,
      directPrestige: 0,
      assistPrestigeReceived: 0,
      objectivePrestige: 0,
      contracts: 0,
      failures: 0,
      assists: 1,
      createdAt: 1,
      assistRecipients: {
        p2: 1,
      },
      assistPrestigeRecipients: {
        p2: 3,
      },
    },
  ],
  timeline: [],
} as any;

const focusedDataset = buildAssistNetworkDataset({
  games: [game],
  scopedPlayerIds: ["p1", "p2", "p3", "p4"],
});

assert.equal(
  focusedDataset.exactScopeApplied,
  false,
  "scoping visible players should not automatically force an exact-table filter",
);
assert.equal(
  focusedDataset.gameCount,
  1,
  "assist data should still include Supabase games when the scoped roster is only a visual focus",
);
assert.equal(focusedDataset.edges.length, 1);
// A round's assistRecipients names who helped the player taking the turn, so
// the assister is the edge source and the turn player is the target.
assert.equal(focusedDataset.edges[0]?.sourceId, "p2");
assert.equal(focusedDataset.edges[0]?.targetId, "p1");

const exactDataset = buildAssistNetworkDataset({
  games: [game],
  scopedPlayerIds: ["p1", "p2", "p3", "p4"],
  exactScopePlayerIds: ["p1", "p2", "p3", "p4"],
} as any);

assert.equal(
  exactDataset.exactScopeApplied,
  true,
  "explicit exact-scope requests should keep the exact-table filtering behavior",
);
assert.equal(
  exactDataset.gameCount,
  0,
  "an explicit exact-scope request should still reject non-matching tables",
);

console.log("assist-network-supabase-scope.test.ts passed");
