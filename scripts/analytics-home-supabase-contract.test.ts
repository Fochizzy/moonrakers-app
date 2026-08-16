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
    },
  });
  assert.equal(payload.hero.games, 12);
}

main()
  .then(() => {
    console.log("analytics-home-supabase-contract.test.ts passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
