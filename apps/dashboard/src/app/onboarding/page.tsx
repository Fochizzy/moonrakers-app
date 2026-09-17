import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { normalizeDashboardProfile } from "@/lib/auth/profileReadiness";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { saveOnboardingProfile } from "./actions";

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect("/auth?reason=session-expired");
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, player_name, display_name, favorite_color, assigned_card_art_index")
    .eq("id", user.id)
    .maybeSingle();

  const profile = normalizeDashboardProfile(profileRow);

  return (
    <div className="centered-shell">
      <main className="centered-shell__body">
        <OnboardingForm
          action={saveOnboardingProfile}
          initialProfile={profile}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
