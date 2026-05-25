import {
  executeAnalyticsReadRpc,
  getDefaultAnalyticsRpcClient,
  resolveAnalyticsCall,
  type AnalyticsRpcClient,
  type ChartDatasetParams,
  type ChartDatasetPayload,
} from "./types.ts";

export async function getChartDataset(
  params: ChartDatasetParams,
): Promise<ChartDatasetPayload>;
export async function getChartDataset(
  client: AnalyticsRpcClient,
  params: ChartDatasetParams,
): Promise<ChartDatasetPayload>;
export async function getChartDataset(
  clientOrParams: AnalyticsRpcClient | ChartDatasetParams | undefined,
  maybeParams?: ChartDatasetParams,
): Promise<ChartDatasetPayload> {
  const { client, params } = await resolveAnalyticsCall(
    getDefaultAnalyticsRpcClient,
    clientOrParams,
    maybeParams,
  );
  return executeAnalyticsReadRpc(
    client,
    "get_chart_dataset",
    {
      chart_key: params.chartKey,
      profile_id: params.profileId,
      focus_player_id: params.focusPlayerId,
      compare_player_id: params.comparePlayerId,
      scoped_player_ids: params.scopedPlayerIds,
      selected_game_id: params.selectedGameId,
      metric_key: params.metricKey,
      line_mode: params.lineMode,
      graph_mode: params.graphMode,
      opponent_id: params.opponentId,
    },
    params.profileId,
  );
}
