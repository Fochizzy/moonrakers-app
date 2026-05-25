import {
  supabase,
} from "@/lib/supabase";
import { loadCloudSnapshot } from "@/lib/cloud/loadCloudSnapshot";
import { isDeletedAtColumnMissingError } from "@/lib/cloud/profileSoftDeleteCompat";
import { loadRegisteredProfiles } from "@/lib/cloud/loadRegisteredProfiles";
import { loadStatsSnapshot } from "@/lib/cloud/loadStatsSnapshot";
import type { AuthProfile, AuthSession } from "@/store/useStore";
import { mergeRegisteredProfilesIntoPlayers } from "@/utils/registeredProfilePlayer";

export function normalizeAuthSession(sessionLike: unknown): AuthSession {
  if (!sessionLike || typeof sessionLike !== "object") {
    return null;
  }

  const user = (sessionLike as { user?: { id?: unknown; email?: unknown } }).user;
  const userId = String(user?.id ?? "").trim();

  if (!userId) {
    return null;
  }

  const email =
    typeof user?.email === "string" && user.email.trim().length > 0
      ? user.email.trim()
      : null;

  return {
    user: {
      id: userId,
      email,
    },
  };
}

export async function loadAuthProfile(userId: string): Promise<AuthProfile> {
  let { data, error } = await supabase
    .from("profiles")
    .select("id, player_name, display_name, favorite_color, assigned_card_art_index")
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (isDeletedAtColumnMissingError(error)) {
    ({ data, error } = await supabase
      .from("profiles")
      .select("id, player_name, display_name, favorite_color, assigned_card_art_index")
      .eq("id", userId)
      .maybeSingle());
  }

  if (error) {
    throw error;
  }

  if (!data?.id) {
    return null;
  }

  return {
    id: data.id,
    player_name: data.player_name ?? null,
    display_name: data.display_name ?? null,
    favorite_color: data.favorite_color ?? null,
    assigned_card_art_index: data.assigned_card_art_index ?? null,
  };
}

export async function loadHydratedSharedSnapshot(session: AuthSession) {
  if (!session?.user?.id) {
    throw new Error("Signed-in session required to hydrate the shared cloud snapshot.");
  }

  const [snapshot, registeredProfiles] = await Promise.all([
    loadCloudSnapshot(session.user.id),
    loadRegisteredProfiles().catch(() => []),
  ]);
  const statsSnapshot = await loadStatsSnapshot({
    profileId: session.user.id,
    groups: snapshot.groups,
    games: snapshot.games,
  });

  return {
    session,
    snapshot: {
      ...snapshot,
      players: mergeRegisteredProfilesIntoPlayers(snapshot.players, registeredProfiles),
    },
    statsSnapshot,
  };
}
