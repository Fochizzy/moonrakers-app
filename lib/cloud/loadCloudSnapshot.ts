import { supabase } from "../supabase";
import { normalizeCloudSnapshot } from "./normalizeCloudSnapshot";
import { isDeletedAtColumnMissingError } from "./profileSoftDeleteCompat";

async function loadProfileRow(profileId: string) {
  let { data, error } = await supabase
    .from("profiles")
    .select("id, player_name, display_name, favorite_color, assigned_card_art_index")
    .eq("id", profileId)
    .is("deleted_at", null)
    .single();

  if (isDeletedAtColumnMissingError(error)) {
    ({ data, error } = await supabase
      .from("profiles")
      .select("id, player_name, display_name, favorite_color, assigned_card_art_index")
      .eq("id", profileId)
      .single());
  }

  return { data, error };
}

export async function loadCloudSnapshot(profileId: string) {
  const [profileResult, groupsResult, gamesResult] = await Promise.all([
    loadProfileRow(profileId),
    supabase
      .from("groups")
      .select(
        `
          id,
          name,
          created_at,
          group_members (
            position,
            profile:profiles (
              id,
              player_name,
              display_name,
              favorite_color,
              assigned_card_art_index
            )
            )
        `,
      )
      .order("name", { ascending: true }),
    supabase
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
      .order("created_at", { ascending: false }),
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }

  if (groupsResult.error) {
    throw groupsResult.error;
  }

  if (gamesResult.error) {
    throw gamesResult.error;
  }

  return normalizeCloudSnapshot({
    profile: profileResult.data,
    groups: groupsResult.data ?? [],
    games: gamesResult.data ?? [],
  });
}
