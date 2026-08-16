import assert from "node:assert/strict";
import type { AnalyticsRpcClient } from "@moonrakers/analytics-contract";

import { getPlayerProfileScreen } from "../lib/cloud/analytics/getPlayerProfileScreen.ts";

async function main() {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const rpcPayload = {
    generatedAt: "2026-05-25T16:00:00.000Z",
    selectedPlayerId: "focus-player",
    hero: {
      name: "Astra",
    },
  };
  const client: AnalyticsRpcClient = {
    async rpc<TPayload>(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args });
      return { data: rpcPayload as TPayload, error: null };
    },
  };

  const payload = await getPlayerProfileScreen(client, {
    profileId: "11111111-1111-4111-8111-111111111111",
    focusPlayerId: "22222222-2222-4222-8222-222222222222",
    opponentId: "33333333-3333-4333-8333-333333333333",
  });

  assert.equal(rpcCalls.length, 1, "expected one player-profile-screen RPC call");
  assert.deepEqual(rpcCalls[0], {
    name: "get_player_profile_screen",
    args: {
      profile_id: "11111111-1111-4111-8111-111111111111",
      focus_player_id: "22222222-2222-4222-8222-222222222222",
      opponent_id: "33333333-3333-4333-8333-333333333333",
    },
  });
  assert.equal(payload.selectedPlayerId, "focus-player");
  assert.equal(payload.hero.name, "Astra");
}

main()
  .then(() => {
    console.log("player-profile-screen-supabase-contract.test.ts passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
