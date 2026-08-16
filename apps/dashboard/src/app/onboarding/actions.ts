"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type OnboardingActionResult = {
  ok: boolean;
  message?: string;
};

export async function saveOnboardingProfile(
  formData: FormData,
): Promise<OnboardingActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, message: "Signed-in session required." };
  }

  const payload = {
    id: user.id,
    player_name: String(formData.get("player_name") ?? "").trim(),
    display_name: String(formData.get("display_name") ?? "").trim() || null,
    favorite_color: String(formData.get("favorite_color") ?? "").trim() || null,
    assigned_card_art_index: null,
  };

  if (!payload.player_name || !payload.favorite_color) {
    return {
      ok: false,
      message: "Player name and favorite color are required.",
    };
  }

  const { error } = await supabase.from("profiles").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  revalidatePath("/onboarding");

  return { ok: true };
}
