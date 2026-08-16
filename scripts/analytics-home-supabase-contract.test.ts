import assert from "node:assert/strict";
import type { AnalyticsRpcClient } from "@moonrakers/analytics-contract";

import { getAnalyticsHome } from "../lib/cloud/analytics/getAnalyticsHome.ts";

async function main() {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const rpcPayload = {
    hero: {
      games: 12,
    },
  };
  const client: AnalyticsRpcClient = {
    async rpc<TPayload>(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args });
      return { data: rpcPayload as TPayload, error: null };
    },
  };

  const payload = await getAnalyticsHome(
    client,
    {
      profileId: "11111111-1111-4111-8111-111111111111",
    },
  );

  assert.equal(rpcCalls.length, 1, "expected one analytics-home RPC call");
  assert.deepEqual(rpcCalls[0], {
    name: "get_analytics_home",
    args: {
      profile_id: "11111111-1111-4111-8111-111111111111",
      focus_player_id: null,
    },
  });
  assert.equal(payload.hero.games, 12);

  // profile_id is the authenticated requester and the RPC raises on anything
  // else, so a focused player has to travel in its own argument.
  await getAnalyticsHome(client, {
    profileId: "11111111-1111-4111-8111-111111111111",
    focusPlayerId: "22222222-2222-4222-8222-222222222222",
  });

  assert.equal(rpcCalls.length, 2, "expected a second analytics-home RPC call");
  assert.deepEqual(rpcCalls[1], {
    name: "get_analytics_home",
    args: {
      profile_id: "11111111-1111-4111-8111-111111111111",
      focus_player_id: "22222222-2222-4222-8222-222222222222",
    },
  });
}

main()
  .then(() => {
    console.log("analytics-home-supabase-contract.test.ts passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
