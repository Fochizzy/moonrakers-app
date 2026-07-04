import {
  getInsightsScreen as getSharedInsightsScreen,
  type AnalyticsRpcClient,
  type InsightsScreenParams,
  type InsightsScreenPayload,
} from "@moonrakers/analytics-contract";
import { getDefaultAnalyticsRpcClient, resolveAnalyticsCall } from "./types.ts";

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

  return getSharedInsightsScreen(client, params);
}
