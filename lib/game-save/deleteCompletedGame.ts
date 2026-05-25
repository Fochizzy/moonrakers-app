type SupabaseRpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>;
};

type DeleteCompletedGameDeps = {
  supabaseClient?: SupabaseRpcClient;
};

export async function deleteCompletedGame(
  gameId: string,
  deps: DeleteCompletedGameDeps = {},
) {
  const normalizedGameId = String(gameId ?? "").trim();
  if (!normalizedGameId) {
    throw new Error("gameId is required");
  }

  const supabaseClient =
    deps.supabaseClient ?? (await import("../supabase")).supabase;
  const { data, error } = await supabaseClient.rpc("delete_completed_game", {
    target_game_id: normalizedGameId,
  });

  if (error) {
    throw error;
  }

  return data;
}
