import {
  executeAnalyticsReadRpc,
  resolveAnalyticsCall,
  type AnalyticsRpcClient,
} from "./internal.ts";
import type { EloScreenParams, EloScreenPayload } from "./types.ts";

export async function getEloScreen(
  client: AnalyticsRpcClient,
  params: EloScreenParams,
): Promise<EloScreenPayload> {
  const resolved = await resolveAnalyticsCall(client, params);

  return executeAnalyticsReadRpc(
    resolved.client,
    "get_elo_screen",
    {
      profile_id: resolved.params.profileId,
      focus_player_id: resolved.params.focusPlayerId,
      opponent_id: resolved.params.opponentId,
      sort_key: resolved.params.sortKey,
    },
    resolved.params.profileId,
  );
}
