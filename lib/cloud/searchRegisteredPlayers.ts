export type RegisteredPlayerSearchResult = {
  id: string;
  player_name: string;
  display_name?: string | null;
  favorite_color?: string | null;
  assigned_card_art_index?: number | null;
};

export async function searchRegisteredPlayers(query: string) {
  const term = query.trim();
  if (!term) {
    return [] as RegisteredPlayerSearchResult[];
  }

  const { supabase } = await import("../supabase");
  const { data, error } = await supabase.rpc("search_profiles_by_player_name", {
    query: term,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as RegisteredPlayerSearchResult[];
}

export function buildGroupDraft(
  results: Array<{ id: string }>,
  selectedIds: string[],
) {
  const allowed = new Set(results.map((result) => result.id));
  const deduped = Array.from(
    new Set(selectedIds.filter((id) => allowed.has(id))),
  );

  return {
    selectedIds: deduped,
    canStartGame: deduped.length >= 2 && deduped.length <= 5,
  };
}
