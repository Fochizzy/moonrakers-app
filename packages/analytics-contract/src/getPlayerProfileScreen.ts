import {
  executeAnalyticsReadRpc,
  resolveAnalyticsCall,
  type AnalyticsRpcClient,
} from "./internal.ts";
import type {
  PlayerProfileScreenParams,
  PlayerProfileScreenPayload,
} from "./types.ts";

export async function getPlayerProfileScreen(
  client: AnalyticsRpcClient,
  params: PlayerProfileScreenParams,
): Promise<PlayerProfileScreenPayload> {
  const resolved = await resolveAnalyticsCall(client, params);

  return executeAnalyticsReadRpc(
    resolved.client,
    "get_player_profile_screen",
    {
      profile_id: resolved.params.profileId,
      focus_player_id: resolved.params.focusPlayerId,
      opponent_id: resolved.params.opponentId,
    },
    resolved.params.profileId,
  );
}
