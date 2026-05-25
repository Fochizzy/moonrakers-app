import assert from "node:assert/strict";

import { getChartSetup } from "../lib/cloud/analytics/getChartSetup.ts";

async function main() {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const rpcPayload = {
    chartKey: "elo",
    defaults: {
      focusPlayerId: "player-1",
      scopedPlayerIds: ["player-1", "player-2"],
    },
  };
  const client = {
    async rpc(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args });
      return { data: rpcPayload, error: null };
    },
  };

  const payload = await getChartSetup(client as any, {
    chartKey: "elo",
    profileId: "setup-profile",
  });

  assert.equal(rpcCalls.length, 1, "expected one chart-setup RPC call");
  assert.deepEqual(rpcCalls[0], {
    name: "get_chart_setup",
    args: {
      chart_key: "elo",
      profile_id: "setup-profile",
    },
  });
  assert.equal(payload.chartKey, "elo");
  assert.deepEqual(payload.defaults.scopedPlayerIds, ["player-1", "player-2"]);
}

main()
  .then(() => {
    console.log("chart-setup-supabase-contract.test.ts passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
