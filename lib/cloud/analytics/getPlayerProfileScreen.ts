import {
  getPlayerProfileScreen as getSharedPlayerProfileScreen,
  type AnalyticsRpcClient,
  type PlayerProfileScreenParams,
  type PlayerProfileScreenPayload,
} from "@moonrakers/analytics-contract";
import { getDefaultAnalyticsRpcClient, resolveAnalyticsCall } from "./types.ts";

export async function getPlayerProfileScreen(
  params: PlayerProfileScreenParams,
): Promise<PlayerProfileScreenPayload>;
export async function getPlayerProfileScreen(
  client: AnalyticsRpcClient,
  params: PlayerProfileScreenParams,
): Promise<PlayerProfileScreenPayload>;
export async function getPlayerProfileScreen(
  clientOrParams: AnalyticsRpcClient | PlayerProfileScreenParams | undefined,
  maybeParams?: PlayerProfileScreenParams,
): Promise<PlayerProfileScreenPayload> {
  const { client, params } = await resolveAnalyticsCall(
    getDefaultAnalyticsRpcClient,
    clientOrParams,
    maybeParams,
  );

  return getSharedPlayerProfileScreen(client, params);
}
