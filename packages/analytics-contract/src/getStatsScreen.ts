import {
  executeAnalyticsReadRpc,
  resolveAnalyticsCall,
  type AnalyticsRpcClient,
} from "./internal.ts";
import { normalizeAnalyticsMetricCards } from "./metricCards.ts";
import type { StatsScreenParams, StatsScreenPayload } from "./types.ts";

export async function getStatsScreen(
  client: AnalyticsRpcClient,
  params: StatsScreenParams,
): Promise<StatsScreenPayload> {
  const resolved = await resolveAnalyticsCall(client, params);

  const payload = await executeAnalyticsReadRpc<StatsScreenPayload>(
    resolved.client,
    "get_stats_screen",
    {
      profile_id: resolved.params.profileId,
      focus_player_id: resolved.params.focusPlayerId,
    },
    resolved.params.profileId,
  );

  return {
    ...payload,
    overview: {
      ...payload?.overview,
      cards: normalizeAnalyticsMetricCards(payload?.overview?.cards),
    },
  };
}
