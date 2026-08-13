import { supabase } from "../supabase";

type Input = {
  gameId: string;
  participantProfileIds: string[];
};

/**
 * save_completed_game suppresses the rollup trigger so finishing a game does not block
 * on a full analytics rebuild. That makes this call the only thing keeping
 * personal_stats_rollups current, and the caller treats a failure here as non-fatal --
 * the game is already saved. A single dropped request therefore used to strand the
 * rollup permanently, which is how it ended up two finished games behind.
 *
 * Retrying covers the transient cases. Anything that survives the retries is caught by
 * reconcileStaleRollup() on a later app run.
 */
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 400;

function uniqueIds(values: string[]) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// supabase.rpc() returns a thenable query builder rather than a real Promise, so this
// takes PromiseLike and awaits it.
async function callWithRetry(
  label: string,
  run: () => PromiseLike<{ error: unknown }>,
) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const { error } = await run();
    if (!error) {
      return;
    }

    lastError = error;

    if (attempt < MAX_ATTEMPTS) {
      // Linear backoff: these are seconds-long analytics rebuilds, not rate-limited
      // endpoints, so there is nothing to be gained from backing off aggressively.
      await delay(RETRY_BASE_DELAY_MS * attempt);
    }
  }

  console.warn(`${label} failed after ${MAX_ATTEMPTS} attempts.`, lastError);
  throw lastError;
}

export async function refreshFinishedGameCloudState(input: Input) {
  const gameId = String(input.gameId ?? "").trim();
  if (!gameId) {
    throw new Error("Saved game id required to refresh finished-game cloud state.");
  }

  for (const profileId of uniqueIds(input.participantProfileIds)) {
    await callWithRetry(
      `refresh_completed_game_participant_rollup(${profileId})`,
      () =>
        supabase.rpc("refresh_completed_game_participant_rollup", {
          target_game_id: gameId,
          target_profile_id: profileId,
        }),
    );
  }

  await callWithRetry("refresh_elo_rollups", () =>
    supabase.rpc("refresh_elo_rollups"),
  );
}
