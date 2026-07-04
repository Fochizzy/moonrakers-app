import {
  executeAnalyticsReadRpc,
  resolveAnalyticsCall,
  type AnalyticsRpcClient,
} from "./internal.ts";
import type { InsightsScreenParams, InsightsScreenPayload } from "./types.ts";

export async function getInsightsScreen(
  client: AnalyticsRpcClient,
  params: InsightsScreenParams,
): Promise<InsightsScreenPayload> {
  const resolved = await resolveAnalyticsCall(client, params);

  return executeAnalyticsReadRpc(
    resolved.client,
    "get_insights_screen",
    {
      profile_id: resolved.params.profileId,
    },
    resolved.params.profileId,
  );
}
