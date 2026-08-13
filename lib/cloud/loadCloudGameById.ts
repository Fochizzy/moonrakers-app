import { isUuid } from "@/lib/ids/uuid";
import { supabase } from "@/lib/supabase";
import { normalizeCloudSnapshot } from "./normalizeCloudSnapshot";

/**
 * Loads a single finished game straight from the cloud and normalizes it into
 * the same shape the local store holds.
 *
 * Screens that open a saved game resolve it from the in-memory store, which is
 * only populated by the shared cloud bootstrap. Server-authored surfaces (the
 * player profile's recent games, for one) can link to a game before that
 * snapshot lands, so those screens need a way to fetch the one game they need.
 *
 * Returns null when the id is not a cloud id, the game is not finished, or the
 * row is not readable.
 */
export async function loadCloudGameById(gameId: string) {
  const normalizedGameId = String(gameId ?? "").trim();

  // Local ids are not uuids; querying with one would be a type error server side.
  if (!isUuid(normalizedGameId)) {
    return null;
  }

  const { data, error } = await supabase
    .from("games")
    .select(
      `
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
      `,
    )
    .eq("id", normalizedGameId)
    .eq("status", "finished")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const snapshot = normalizeCloudSnapshot({
    profile: null,
    groups: [],
    games: [data],
  });

  return snapshot.games[0] ?? null;
}

export default loadCloudGameById;
