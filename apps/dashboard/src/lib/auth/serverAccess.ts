import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "../supabase/server";
import { isProfileComplete, normalizeDashboardProfile } from "./profileReadiness";

export async function requireDashboardAccess() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) {
    redirect("/auth?reason=session-expired");
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("id, player_name, display_name, favorite_color, assigned_card_art_index")
    .eq("id", claims.sub)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const profile = normalizeDashboardProfile(profileRow);
  if (!isProfileComplete(profile)) {
    redirect("/onboarding");
  }

  return { supabase, userId: claims.sub, profile };
}
