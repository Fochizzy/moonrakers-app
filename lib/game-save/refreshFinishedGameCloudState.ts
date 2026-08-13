import { supabase } from "../supabase";

type Input = {
  gameId: string;
  participantProfileIds: string[];
};

function uniqueIds(values: string[]) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

export async function refreshFinishedGameCloudState(input: Input) {
  const gameId = String(input.gameId ?? "").trim();
  if (!gameId) {
    throw new Error("Saved game id required to refresh finished-game cloud state.");
  }

  for (const profileId of uniqueIds(input.participantProfileIds)) {
    const { error } = await supabase.rpc("refresh_completed_game_participant_rollup", {
      target_game_id: gameId,
      target_profile_id: profileId,
    });

    if (error) {
      throw error;
    }
  }

  const { error } = await supabase.rpc("refresh_elo_rollups");
  if (error) {
    throw error;
  }
}
