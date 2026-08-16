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
 * Runs at most once per app session on the analytics read path, with two extra
 * triggers for the window that leaves open: a failed finish-game refresh marks the
 * rollup possibly stale so the next analytics load re-checks in the same session, and
 * returning to the foreground re-checks on a throttle so a phone that keeps the app
 * in memory for days does not serve stale numbers until a restart.
 */
const FOREGROUND_RECHECK_INTERVAL_MS = 5 * 60 * 1000;

let reconcilePromise: Promise<void> | null = null;
let reconcileStartedAt = 0;

async function runReconcile() {
  reconcileStartedAt = Date.now();
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

/**
 * Called when the finish-game refresh fails after saving: the rollup is now known to
 * be behind, so the once-per-session guard must not suppress the next re-check.
 */
export function markRollupPossiblyStale() {
  reconcilePromise = null;
  reconcileStartedAt = 0;
}

/**
 * Re-checks on app foreground, throttled so tab-switching does not hammer the RPC.
 * The server no-ops when nothing is stale, so the cost of a re-check is one count
 * query.
 */
export function reconcileStaleRollupOnForeground() {
  const recentEnough =
    reconcileStartedAt > 0 &&
    Date.now() - reconcileStartedAt < FOREGROUND_RECHECK_INTERVAL_MS;

  if (reconcilePromise && recentEnough) {
    return reconcilePromise;
  }

  reconcilePromise = runReconcile();
  return reconcilePromise;
}

/** Test seam: lets a suite exercise the once-per-session guard. */
export function resetReconcileStaleRollupForTests() {
  reconcilePromise = null;
  reconcileStartedAt = 0;
}
