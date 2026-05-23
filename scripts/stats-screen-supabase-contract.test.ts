import assert from "node:assert/strict";

import { getStatsScreen } from "../lib/cloud/analytics/getStatsScreen.ts";

async function main() {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const rpcPayload = {
    overview: {
      hero: {
        takeaway: "Nova leads",
      },
    },
  };

  const payload = await getStatsScreen(
    {
      profileId: "stats-profile",
    },
    {
      callRpc: async (name: string, args: Record<string, unknown>) => {
        rpcCalls.push({ name, args });
        return { data: rpcPayload, error: null };
      },
    },
  );

  assert.equal(rpcCalls.length, 1, "expected one stats-screen RPC call");
  assert.deepEqual(rpcCalls[0], {
    name: "get_stats_screen",
    args: {
      profile_id: "stats-profile",
    },
  });
  assert.equal(payload.overview.hero.takeaway, "Nova leads");
}

main()
  .then(() => {
    console.log("stats-screen-supabase-contract.test.ts passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
