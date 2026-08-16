import {
  executeAnalyticsReadRpc,
  resolveAnalyticsCall,
  type AnalyticsRpcClient,
} from "./internal.ts";
import type { ChartDatasetParams, ChartDatasetPayload } from "./types.ts";

export async function getChartDataset(
  client: AnalyticsRpcClient,
  params: ChartDatasetParams,
): Promise<ChartDatasetPayload> {
  const resolved = await resolveAnalyticsCall(client, params);

  return executeAnalyticsReadRpc(
    resolved.client,
    "get_chart_dataset",
    {
      chart_key: resolved.params.chartKey,
      profile_id: resolved.params.profileId,
      focus_player_id: resolved.params.focusPlayerId,
      compare_player_id: resolved.params.comparePlayerId,
      scoped_player_ids: resolved.params.scopedPlayerIds,
      selected_game_id: resolved.params.selectedGameId,
      metric_key: resolved.params.metricKey,
      line_mode: resolved.params.lineMode,
      graph_mode: resolved.params.graphMode,
      opponent_id: resolved.params.opponentId,
    },
    resolved.params.profileId,
  );
}
