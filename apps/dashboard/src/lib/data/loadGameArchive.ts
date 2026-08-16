import { normalizeCloudSnapshot } from "../../../../../lib/cloud/normalizeCloudSnapshot";

import { requireDashboardAccess } from "../auth/serverAccess";
import { toGameArchive } from "./gameArchive";
import type { GameArchive } from "./gameArchiveTypes";

const GROUP_SELECT = `
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
`;

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

type ArchiveSupabaseClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => {
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        order: (
          column: string,
          options: { ascending: boolean },
        ) => Promise<{ data: unknown; error: unknown }>;
      };
      order: (
        column: string,
        options: { ascending: boolean },
      ) => Promise<{ data: unknown; error: unknown }>;
    };
  };
};

/**
 * Read the signed-in player's finished-game archive straight from the row
 * tables, then reuse the app's snapshot normalizer so web totals, winners, and
 * round timelines match what the mobile app renders for the same data.
 */
export async function loadGameArchiveWithClient(
  supabase: ArchiveSupabaseClient,
  profileId: string,
): Promise<GameArchive> {
  const [profileResult, groupsResult, gamesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, player_name, display_name, favorite_color, assigned_card_art_index",
      )
      .eq("id", profileId)
      .maybeSingle(),
    supabase.from("groups").select(GROUP_SELECT).order("name", {
      ascending: true,
    }),
    supabase
      .from("games")
      .select(GAME_SELECT)
      .eq("status", "finished")
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

  const snapshot = normalizeCloudSnapshot({
    profile: (profileResult.data ?? null) as never,
    groups: (groupsResult.data ?? []) as never,
    games: (gamesResult.data ?? []) as never,
  });

  return toGameArchive(snapshot);
}

export async function loadGameArchive(): Promise<
  GameArchive & { profileId: string }
> {
  const { supabase, userId } = await requireDashboardAccess();
  const archive = await loadGameArchiveWithClient(
    supabase as unknown as ArchiveSupabaseClient,
    userId,
  );

  return { ...archive, profileId: userId };
}
