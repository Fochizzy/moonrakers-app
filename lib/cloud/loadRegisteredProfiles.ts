import { supabase } from "../supabase";
import { normalizeRegisteredProfiles } from "./normalizeRegisteredProfiles";

export async function loadRegisteredProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, player_name, display_name, favorite_color, assigned_card_art_index")
    .order("player_name", { ascending: true });

  if (error) {
    throw error;
  }

  return normalizeRegisteredProfiles(data ?? []);
}
