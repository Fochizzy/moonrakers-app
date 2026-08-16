import {
  executeAnalyticsReadRpc,
  resolveAnalyticsCall,
  type AnalyticsRpcClient,
} from "./internal.ts";
import { normalizeAnalyticsMetricCards } from "./metricCards.ts";
import type { AnalyticsHomeParams, AnalyticsHomePayload } from "./types.ts";

export async function getAnalyticsHome(
  client: AnalyticsRpcClient,
  params: AnalyticsHomeParams,
): Promise<AnalyticsHomePayload> {
  const resolved = await resolveAnalyticsCall(client, params);

  const payload = await executeAnalyticsReadRpc<AnalyticsHomePayload>(
    resolved.client,
    "get_analytics_home",
    {
      profile_id: resolved.params.profileId,
    },
    resolved.params.profileId,
  );

  return {
    ...payload,
    cards: normalizeAnalyticsMetricCards(payload?.cards),
  };
}
