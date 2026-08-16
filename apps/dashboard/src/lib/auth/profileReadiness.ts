export type DashboardProfile = {
  id: string;
  player_name: string | null;
  display_name: string | null;
  favorite_color: string | null;
  assigned_card_art_index: number | null;
};

export function normalizeDashboardProfile(input: Partial<DashboardProfile> | null) {
  if (!input?.id) {
    return null;
  }

  return {
    id: String(input.id).trim(),
    player_name: String(input.player_name ?? "").trim() || null,
    display_name: String(input.display_name ?? "").trim() || null,
    favorite_color: String(input.favorite_color ?? "").trim() || null,
    assigned_card_art_index:
      typeof input.assigned_card_art_index === "number"
        ? input.assigned_card_art_index
        : null,
  } satisfies DashboardProfile;
}

export function isProfileComplete(profile: DashboardProfile | null) {
  return Boolean(profile?.id && String(profile.player_name ?? "").trim());
}
