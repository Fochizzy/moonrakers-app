import assert from "node:assert/strict";

import { getInsightsScreen } from "../lib/cloud/analytics/getInsightsScreen.ts";

async function main() {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const rpcPayload = {
    meta: {
      games: 5,
    },
  };

  const payload = await getInsightsScreen(
    {
      profileId: "insights-profile",
    },
    {
      callRpc: async (name: string, args: Record<string, unknown>) => {
        rpcCalls.push({ name, args });
        return { data: rpcPayload, error: null };
      },
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
