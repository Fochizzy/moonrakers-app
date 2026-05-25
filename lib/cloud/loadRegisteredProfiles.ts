import { supabase } from "../supabase";
import { normalizeRegisteredProfiles } from "./normalizeRegisteredProfiles";
import { isDeletedAtColumnMissingError } from "./profileSoftDeleteCompat";

export async function loadRegisteredProfiles() {
  let { data, error } = await supabase
    .from("profiles")
    .select("id, player_name, display_name, favorite_color, assigned_card_art_index")
    .is("deleted_at", null)
    .order("player_name", { ascending: true });

  if (isDeletedAtColumnMissingError(error)) {
    ({ data, error } = await supabase
      .from("profiles")
      .select("id, player_name, display_name, favorite_color, assigned_card_art_index")
      .order("player_name", { ascending: true }));
  }

  if (error) {
    throw error;
  }

  return normalizeRegisteredProfiles(data ?? []);
}
