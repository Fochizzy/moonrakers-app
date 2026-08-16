import assert from "node:assert/strict";
import type { AnalyticsRpcClient } from "@moonrakers/analytics-contract";

import { getChartDataset } from "../lib/cloud/analytics/getChartDataset.ts";

async function main() {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const rpcPayload = {
    chartKey: "elo",
  };
  const client: AnalyticsRpcClient = {
    async rpc<TPayload>(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args });
      return { data: rpcPayload as TPayload, error: null };
    },
  };

  const payload = await getChartDataset(
    client,
    {
      chartKey: "elo",
      profileId: "chart-profile",
      focusPlayerId: "player-1",
      comparePlayerId: "player-2",
      scopedPlayerIds: ["player-1", "player-2"],
      selectedGameId: null,
      metricKey: "totalPrestige",
      lineMode: "raw",
      graphMode: null,
      opponentId: null,
    },
  );

  assert.equal(rpcCalls.length, 1, "expected one chart-dataset RPC call");
  assert.deepEqual(rpcCalls[0], {
    name: "get_chart_dataset",
    args: {
      chart_key: "elo",
      profile_id: "chart-profile",
      focus_player_id: "player-1",
      compare_player_id: "player-2",
      scoped_player_ids: ["player-1", "player-2"],
      selected_game_id: null,
      metric_key: "totalPrestige",
      line_mode: "raw",
      graph_mode: null,
      opponent_id: null,
    },
  });
  assert.equal(payload.chartKey, "elo");

  await assert.rejects(
    () =>
      getChartDataset(
        {
          async rpc<_TPayload>() {
            return {
              data: null,
              error: {
                message:
                  "Could not find the function public.get_chart_dataset(chart_key, compare_player_id, focus_player_id, graph_mode, line_mode, metric_key, opponent_id, profile_id, scoped_player_ids, selected_game_id) in the schema cache",
              },
            };
          },
        } satisfies AnalyticsRpcClient,
        {
          chartKey: "elo",
          profileId: "chart-profile",
          focusPlayerId: "player-1",
          comparePlayerId: "player-2",
          scopedPlayerIds: ["player-1", "player-2"],
          selectedGameId: null,
          metricKey: "totalPrestige",
          lineMode: "raw",
          graphMode: null,
          opponentId: null,
        },
      ),
    /analytics schema update/i,
  );
}

main()
  .then(() => {
    console.log("chart-dataset-supabase-contract.test.ts passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
