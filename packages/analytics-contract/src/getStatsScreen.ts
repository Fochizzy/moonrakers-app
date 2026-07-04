import {
  executeAnalyticsReadRpc,
  resolveAnalyticsCall,
  type AnalyticsRpcClient,
} from "./internal.ts";
import type { StatsScreenParams, StatsScreenPayload } from "./types.ts";

export async function getStatsScreen(
  client: AnalyticsRpcClient,
  params: StatsScreenParams,
): Promise<StatsScreenPayload> {
  const resolved = await resolveAnalyticsCall(client, params);

  return executeAnalyticsReadRpc(
    resolved.client,
    "get_stats_screen",
    {
      profile_id: resolved.params.profileId,
    },
    resolved.params.profileId,
  );
}
