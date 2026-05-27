import {
  supabase,
} from "@/lib/supabase";
import { isDeletedAtColumnMissingError } from "@/lib/cloud/profileSoftDeleteCompat";
import type { AuthProfile, AuthSession } from "@/store/useStore";
import { loadHydratedCloudState } from "@/lib/cloud/loadHydratedCloudState";

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
  return loadHydratedCloudState(session);
}
