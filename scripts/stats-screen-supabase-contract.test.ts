import assert from "node:assert/strict";
import type { AnalyticsRpcClient } from "@moonrakers/analytics-contract";

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
  const client: AnalyticsRpcClient = {
    async rpc<TPayload>(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args });
      return { data: rpcPayload as TPayload, error: null };
    },
  };

  const payload = await getStatsScreen(
    client,
    {
      profileId: "stats-profile",
      focusPlayerId: "focus-player",
    },
  );

  assert.equal(rpcCalls.length, 1, "expected one stats-screen RPC call");
  assert.deepEqual(rpcCalls[0], {
    name: "get_stats_screen",
    args: {
      profile_id: "stats-profile",
      focus_player_id: "focus-player",
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
