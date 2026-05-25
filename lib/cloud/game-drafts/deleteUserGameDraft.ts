import { supabase } from "@/lib/supabase";

export async function deleteUserGameDraft(profileId: string) {
  const normalizedProfileId = String(profileId ?? "").trim();
  if (!normalizedProfileId) {
    return;
  }

  const { error } = await supabase
    .from("user_game_drafts")
    .delete()
    .eq("profile_id", normalizedProfileId);

  if (error) {
    throw error;
  }
}
