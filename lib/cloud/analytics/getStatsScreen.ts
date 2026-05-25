import {
  executeAnalyticsReadRpc,
  getDefaultAnalyticsRpcClient,
  resolveAnalyticsCall,
  type AnalyticsRpcClient,
  type StatsScreenParams,
  type StatsScreenPayload,
} from "./types.ts";

export async function getStatsScreen(
  params: StatsScreenParams,
): Promise<StatsScreenPayload>;
export async function getStatsScreen(
  client: AnalyticsRpcClient,
  params: StatsScreenParams,
): Promise<StatsScreenPayload>;
export async function getStatsScreen(
  clientOrParams: AnalyticsRpcClient | StatsScreenParams | undefined,
  maybeParams?: StatsScreenParams,
): Promise<StatsScreenPayload> {
  const { client, params } = await resolveAnalyticsCall(
    getDefaultAnalyticsRpcClient,
    clientOrParams,
    maybeParams,
  );
  return executeAnalyticsReadRpc(
    client,
    "get_stats_screen",
    {
      profile_id: params.profileId,
    },
    params.profileId,
  );
}
