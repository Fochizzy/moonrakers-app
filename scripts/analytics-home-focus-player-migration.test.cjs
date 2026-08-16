// public.get_analytics_home used to accept nothing but the caller's own id, so
// the dashboard passed the focused player as `profile_id` and the RPC raised
// "profile_id must match the authenticated profile" — blanking Home and Data
// through the error boundary whenever the topbar focused anyone else.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260816150000_moonrakers_analytics_home_focus_player.sql",
);

assert.ok(
  fs.existsSync(migrationPath),
  "expected a migration giving public.get_analytics_home a focus_player_id argument",
);

const migrationSource = fs.readFileSync(migrationPath, "utf8");

for (const snippet of [
  "create or replace function private.get_analytics_home_rollup(target_player_id uuid)",
  "select psr.payload->'analyticsHome'",
  "drop function if exists public.get_analytics_home(uuid);",
  "focus_player_id uuid default null",
  "security definer",
  "raise exception 'profile_id must match the authenticated profile'",
  "grant execute on function public.get_analytics_home(uuid, uuid) to authenticated;",
]) {
  assert.ok(
    migrationSource.includes(snippet),
    `expected ${path.basename(migrationPath)} to contain ${snippet}`,
  );
}

assert.ok(
  migrationSource.includes(
    "revoke all on function private.get_analytics_home_rollup(uuid) from authenticated;",
  ),
  "expected the cross-profile rollup read to stay closed to the authenticated role",
);

const contractSource = fs.readFileSync(
  path.join(
    projectRoot,
    "packages",
    "analytics-contract",
    "src",
    "getAnalyticsHome.ts",
  ),
  "utf8",
);

assert.ok(
  contractSource.includes("focus_player_id: resolved.params.focusPlayerId"),
  "expected the analytics-home contract to send focus_player_id to the RPC",
);
assert.ok(
  contractSource.includes("profile_id: resolved.params.profileId"),
  "expected the analytics-home contract to keep profile_id as the requester id",
);

const loaderSource = fs.readFileSync(
  path.join(
    projectRoot,
    "apps",
    "dashboard",
    "src",
    "lib",
    "data",
    "loadDashboardHome.ts",
  ),
  "utf8",
);

assert.ok(
  /getAnalyticsHome\(client,\s*\{\s*profileId:\s*userId,/.test(loaderSource),
  "expected loadDashboardHome to read analytics home as the authenticated user",
);
assert.ok(
  !/getAnalyticsHome\(client,\s*\{\s*profileId:\s*effectiveProfileId/.test(
    loaderSource,
  ),
  "expected loadDashboardHome to stop passing the focused player as profileId",
);

console.log("analytics-home-focus-player-migration.test.cjs passed");
