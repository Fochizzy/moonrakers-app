import { normalizeCloudSnapshot } from "../../../../../lib/cloud/normalizeCloudSnapshot";

import { requireDashboardAccess } from "../auth/serverAccess";
import { toArchiveGame } from "./gameArchive";
import type { ArchiveGame } from "./gameArchiveTypes";

const GAME_SELECT = `
  id,
  host_profile_id,
  group_id,
  group_name_snapshot,
  created_at,
  winner_profile_id,
  game_participants (
    id,
    profile_id,
    player_name_snapshot,
    display_name_snapshot,
    color_snapshot,
    assigned_card_art_index_snapshot,
    start_order,
    total_prestige,
    direct_prestige,
    assist_prestige_received,
    objective_prestige,
    score,
    assists,
    failures,
    contracts,
    is_winner
  ),
  game_rounds (
    participant_id,
    round_index,
    prestige,
    contracts,
    failures,
    assist_recipients,
    assist_prestige_recipients,
    objective_count,
    objective_prestige,
    created_at
  )
`;

export type GameDetail = {
  game: ArchiveGame;
  profileId: string;
};

/**
 * Load a single finished game with its participants and rounds. Row-level
 * security still decides whether the signed-in player can see it, so an
 * unreachable id simply resolves to null.
 */
export async function loadGameDetail(
  gameId: string,
): Promise<GameDetail | null> {
  const { supabase, userId } = await requireDashboardAccess();
  const normalizedGameId = String(gameId ?? "").trim();

  if (!normalizedGameId) {
    return null;
  }

  const { data, error } = await supabase
    .from("games")
    .select(GAME_SELECT)
    .eq("id", normalizedGameId)
    .eq("status", "finished")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const snapshot = normalizeCloudSnapshot({ games: [data] as never });
  const game = toArchiveGame(snapshot.games[0] ?? null);

  return game ? { game, profileId: userId } : null;
}
