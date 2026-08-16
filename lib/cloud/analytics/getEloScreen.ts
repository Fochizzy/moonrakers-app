import {
  getEloScreen as getSharedEloScreen,
  type AnalyticsRpcClient,
  type EloScreenParams,
  type EloScreenPayload,
} from "@moonrakers/analytics-contract";
import { getDefaultAnalyticsRpcClient, resolveAnalyticsCall } from "./types.ts";

// Delegated shared RPC contract:
// "get_elo_screen"
// profile_id: params.profileId
// focus_player_id: params.focusPlayerId
// opponent_id: params.opponentId
// sort_key: params.sortKey

export async function getEloScreen(
  params: EloScreenParams,
): Promise<EloScreenPayload>;
export async function getEloScreen(
  client: AnalyticsRpcClient,
  params: EloScreenParams,
): Promise<EloScreenPayload>;
export async function getEloScreen(
  clientOrParams: AnalyticsRpcClient | EloScreenParams | undefined,
  maybeParams?: EloScreenParams,
): Promise<EloScreenPayload> {
  const { client, params } = await resolveAnalyticsCall(
    getDefaultAnalyticsRpcClient,
    clientOrParams,
    maybeParams,
  );

  return getSharedEloScreen(client, params);
}
