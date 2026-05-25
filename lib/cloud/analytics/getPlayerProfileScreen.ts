import {
  executeAnalyticsReadRpc,
  getDefaultAnalyticsRpcClient,
  resolveAnalyticsCall,
  type AnalyticsRpcClient,
  type PlayerProfileScreenParams,
  type PlayerProfileScreenPayload,
} from "./types.ts";

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

  return executeAnalyticsReadRpc(
    client,
    "get_player_profile_screen",
    {
      profile_id: params.profileId,
      focus_player_id: params.focusPlayerId,
      opponent_id: params.opponentId,
    },
    params.profileId,
  );
}
