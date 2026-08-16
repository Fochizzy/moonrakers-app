import assert from "node:assert/strict";
import type { AnalyticsRpcClient } from "@moonrakers/analytics-contract";

import { getInsightsScreen } from "../lib/cloud/analytics/getInsightsScreen.ts";

async function main() {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const rpcPayload = {
    meta: {
      games: 5,
    },
  };
  const client: AnalyticsRpcClient = {
    async rpc<TPayload>(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args });
      return { data: rpcPayload as TPayload, error: null };
    },
  };

  const payload = await getInsightsScreen(
    client,
    {
      profileId: "insights-profile",
    },
  );

  assert.equal(rpcCalls.length, 1, "expected one insights-screen RPC call");
  assert.deepEqual(rpcCalls[0], {
    name: "get_insights_screen",
    args: {
      profile_id: "insights-profile",
    },
  });
  assert.equal(payload.meta.games, 5);
}

main()
  .then(() => {
    console.log("insights-screen-supabase-contract.test.ts passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
