import {
  executeAnalyticsReadRpc,
  getDefaultAnalyticsRpcClient,
  resolveAnalyticsCall,
  type AnalyticsRpcClient,
  type InsightsScreenParams,
  type InsightsScreenPayload,
} from "./types.ts";

export async function getInsightsScreen(
  params: InsightsScreenParams,
): Promise<InsightsScreenPayload>;
export async function getInsightsScreen(
  client: AnalyticsRpcClient,
  params: InsightsScreenParams,
): Promise<InsightsScreenPayload>;
export async function getInsightsScreen(
  clientOrParams: AnalyticsRpcClient | InsightsScreenParams | undefined,
  maybeParams?: InsightsScreenParams,
): Promise<InsightsScreenPayload> {
  const { client, params } = await resolveAnalyticsCall(
    getDefaultAnalyticsRpcClient,
    clientOrParams,
    maybeParams,
  );
  return executeAnalyticsReadRpc(
    client,
    "get_insights_screen",
    {
      profile_id: params.profileId,
    },
    params.profileId,
  );
}
