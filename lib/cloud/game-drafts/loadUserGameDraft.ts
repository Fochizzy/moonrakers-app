import type { GameDraft } from "@/lib/game-draft/types";
import { supabase } from "@/lib/supabase";

import { normalizeGameDraftRow } from "./normalizeGameDraftRow";

export async function loadUserGameDraft(profileId: string): Promise<GameDraft | null> {
  const normalizedProfileId = String(profileId ?? "").trim();
  if (!normalizedProfileId) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_game_drafts")
    .select("*")
    .eq("profile_id", normalizedProfileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeGameDraftRow(data);
}
