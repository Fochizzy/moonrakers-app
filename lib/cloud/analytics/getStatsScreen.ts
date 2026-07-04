import {
  getStatsScreen as getSharedStatsScreen,
  type AnalyticsRpcClient,
  type StatsScreenParams,
  type StatsScreenPayload,
} from "@moonrakers/analytics-contract";
import { getDefaultAnalyticsRpcClient, resolveAnalyticsCall } from "./types.ts";

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

  return getSharedStatsScreen(client, params);
}
