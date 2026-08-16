import { NextResponse } from "next/server";

import {
  isProfileComplete,
  normalizeDashboardProfile,
} from "@/lib/auth/profileReadiness";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") || "/";

  const supabase = await createServerSupabaseClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (type === "recovery") {
    return NextResponse.redirect(new URL("/auth?mode=reset-sent", url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.redirect(
      new URL("/auth?reason=session-expired", url.origin),
    );
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, player_name, display_name, favorite_color, assigned_card_art_index")
    .eq("id", user.id)
    .maybeSingle();

  const profile = normalizeDashboardProfile(profileRow);

  return NextResponse.redirect(
    new URL(isProfileComplete(profile) ? next : "/onboarding", url.origin),
  );
}
