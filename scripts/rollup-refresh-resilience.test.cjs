const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts), "utf8");

// ---------------------------------------------------------------- migration
const migration = read(
  "supabase",
  "migrations",
  "20260813190000_moonrakers_reconcile_stale_rollup.sql",
);

// The public wrapper must be security definer: authenticated has no USAGE on the
// private schema, so a security invoker wrapper fails for every caller.
assert.match(
  migration,
  /create or replace function public\.reconcile_stale_rollup\(\)[\s\S]{0,400}?security definer/i,
  "expected the public wrapper to be security definer so it can reach the private schema",
);

// No target parameter: a caller must only ever be able to reconcile themselves.
assert.match(
  migration,
  /create or replace function public\.reconcile_stale_rollup\(\)/,
  "expected the public entry point to take no profile argument",
);

assert.match(
  migration,
  /viewer_profile_id uuid := \(select auth\.uid\(\)\);/,
  "expected the wrapper to derive the profile from the caller's own token",
);

assert.match(
  migration,
  /raise exception 'authenticated profile is required'/,
  "expected anonymous callers to be rejected",
);

// The whole point is that the expensive rebuild only runs when actually stale.
assert.match(
  migration,
  /if rollup_games is not null and rollup_games = coalesce\(live_games, 0\) then[\s\S]{0,200}?'refreshed', false/,
  "expected a current rollup to short-circuit before admin_refresh_analytics",
);

assert.match(
  migration,
  /perform private\.admin_refresh_analytics\(target_profile_id\);/,
  "expected a stale rollup to trigger the rebuild",
);

for (const revoked of ["public", "anon"]) {
  assert.ok(
    migration.includes(
      `revoke all on function public.reconcile_stale_rollup() from ${revoked};`,
    ),
    `expected execute to be revoked from ${revoked}`,
  );
}

assert.ok(
  migration.includes(
    "grant execute on function public.reconcile_stale_rollup() to authenticated;",
  ),
  "expected authenticated to keep execute",
);

// ---------------------------------------------------------------- client retry
const refresh = read("lib", "game-save", "refreshFinishedGameCloudState.ts");

assert.match(
  refresh,
  /MAX_ATTEMPTS\s*=\s*([2-9]|\d{2,})/,
  "expected the finish-game refresh to retry rather than give up on first failure",
);

assert.match(
  refresh,
  /callWithRetry\(\s*\n?\s*`refresh_completed_game_participant_rollup/,
  "expected the per-participant rollup refresh to go through the retry helper",
);

assert.match(
  refresh,
  /await callWithRetry\("refresh_elo_rollups"/,
  "expected the elo rollup refresh to go through the retry helper",
);

// It must still surface a terminal failure; the caller decides how to report it.
assert.match(
  refresh,
  /throw lastError;/,
  "expected an exhausted retry to still throw",
);

// ---------------------------------------------------------------- heal-later path
const reconcile = read("lib", "cloud", "analytics", "reconcileStaleRollup.ts");

assert.match(
  reconcile,
  /let reconcilePromise: Promise<void> \| null = null;/,
  "expected the reconcile to be memoised so it runs once per session",
);

assert.ok(
  !/throw /.test(reconcile),
  "expected reconcile failures to never break an analytics screen",
);

const hook = read("lib", "cloud", "analytics", "useLiveAnalyticsQuery.ts");

assert.match(
  hook,
  /import \{ reconcileStaleRollupOnce \} from "\.\/reconcileStaleRollup";/,
  "expected the analytics hook to import the reconcile helper",
);

// Must run before the payload load, or the first screen of the session still shows
// stale numbers and only heals in time for the next one.
const awaitIndex = hook.indexOf("await reconcileStaleRollupOnce()");
const loadIndex = hook.indexOf("await loadRef.current()");
assert.ok(awaitIndex > -1, "expected the hook to await the reconcile");
assert.ok(loadIndex > -1, "expected the hook to still load the payload");
assert.ok(
  awaitIndex < loadIndex,
  "expected the reconcile to run before the analytics payload is fetched",
);

console.log("rollup-refresh-resilience.test.cjs passed");
