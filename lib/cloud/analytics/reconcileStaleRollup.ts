import { supabase } from "@/lib/supabase";

/**
 * Repairs a personal_stats_rollups payload that the finish-game flow failed to refresh.
 *
 * save_completed_game suppresses the rollup trigger to keep finishing a game fast, so
 * the rebuild happens in a follow-up client call. That call is best-effort -- the
 * caller catches its failure and reports "Game saved with refresh pending" -- so a
 * dropped request, a killed app, or a timeout leaves the rollup stale indefinitely.
 * Observed live: two finished games missing, which surfaced as wrong game counts and
 * stale totals on the Home leaderboard.
 *
 * The server side only does the expensive rebuild when the rollup's recorded
 * finished-game count actually disagrees with the live count, so the warm path is a
 * single count query.
 *
 * Runs at most once per app session: a stale rollup is repaired on the first analytics
 * load, and anything that happens afterwards is covered by the finish-game refresh.
 */
let reconcilePromise: Promise<void> | null = null;

async function runReconcile() {
  try {
    const { error } = await supabase.rpc("reconcile_stale_rollup");
    if (error) {
      // Never fatal: a stale rollup still renders, just with older numbers, and the
      // next session tries again. Failing the analytics screen over this would be a
      // worse outcome than showing slightly stale data.
      console.warn("reconcile_stale_rollup failed; analytics may be stale.", error);
    }
  } catch (error) {
    console.warn("reconcile_stale_rollup threw; analytics may be stale.", error);
  }
}

export function reconcileStaleRollupOnce() {
  if (!reconcilePromise) {
    reconcilePromise = runReconcile();
  }

  return reconcilePromise;
}

/** Test seam: lets a suite exercise the once-per-session guard. */
export function resetReconcileStaleRollupForTests() {
  reconcilePromise = null;
}
