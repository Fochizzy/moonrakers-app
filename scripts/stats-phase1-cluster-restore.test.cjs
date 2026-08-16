// Guards the get_stats_screen payload contract against silent amputation.
//
// Twice now a rewrite of get_stats_screen has dropped payload the app depends
// on. 20260706030843 recreated it for the focus_player_id signature and returned
// private.get_stats_screen_rollup() straight through, which killed all four
// phase-1 enrichments (Pressure & Context, Form & Closing, both turn-order
// sections). The same rollup passthrough also published the stored per-profile
// players.options, leaving the Focus Player picker with exactly one entry.
//
// The phase-1 rollup-contract guard only reads the 20260527143000 file, so it
// stayed green through the whole regression. This guard instead resolves the
// LAST migration that defines get_stats_screen and asserts the contract against
// that, so the next rewrite has to carry the payload forward or fail here.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");
const helperMigration = "20260816154458_moonrakers_restore_phase1_stats_clusters.sql";

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const statsScreenMigrations = migrationFiles.filter((file) =>
  /create or replace function\s+public\.get_stats_screen/i.test(
    fs.readFileSync(path.join(migrationsDir, file), "utf8"),
  ),
);

assert.ok(
  statsScreenMigrations.length > 0,
  "expected at least one migration to define get_stats_screen",
);

const latestMigration = statsScreenMigrations.at(-1);
const latestSource = fs.readFileSync(path.join(migrationsDir, latestMigration), "utf8");

assert.equal(
  fs.existsSync(path.join(migrationsDir, helperMigration)),
  true,
  `expected ${helperMigration} to exist`,
);

const helperSource = fs.readFileSync(path.join(migrationsDir, helperMigration), "utf8");

for (const helper of [
  "private.phase1_form_closing_cluster",
  "private.phase1_pressure_context_cluster",
  "private.phase1_turn_order_overview",
  "private.phase1_turn_order_by_table_size",
  "private.phase1_turn_order_summary",
]) {
  assert.match(
    helperSource,
    new RegExp(`create or replace function\\s+${helper.replace(/\./g, "\\.")}`, "i"),
    `expected the cluster restore to recreate ${helper}`,
  );
}

// Every path the app reads out of the payload. Losing any one of these renders a
// section blank without erroring, which is exactly how both regressions hid.
for (const jsonPath of [
  "{overview,formClosing}",
  "{players,detail,pressureContext}",
  "{players,options}",
  "{players,selectedPlayerId}",
  "{games,turnOrderOverview}",
  "{games,turnOrderByTableSize}",
  "{correlations,turnOrderSummary}",
]) {
  assert.ok(
    latestSource.includes(`'${jsonPath}'`),
    `expected ${latestMigration} to publish ${jsonPath}`,
  );
}

// The clusters have to follow the focus picker. Keying them off the requester
// would show the viewer's own numbers under another player's name.
for (const focusedCall of [
  /private\.phase1_pressure_context_cluster\(\s*effective_focus_player_id\s*\)/,
  /private\.phase1_turn_order_overview\(effective_focus_player_id\)/,
  /private\.phase1_turn_order_by_table_size\(effective_focus_player_id\)/,
]) {
  assert.match(
    latestSource,
    focusedCall,
    "expected the clusters to be keyed on the focused player",
  );
}

assert.doesNotMatch(
  latestSource,
  /phase1_[a-z_]+\(\s*requester_profile_id\s*\)/,
  "expected no cluster to be keyed on the requesting profile",
);

// players.options must come from the profile directory, not from the stored
// rollup, or the picker collapses to whichever single player is focused.
assert.match(
  latestSource,
  /into player_options[\s\S]{0,200}from public\.profiles/,
  "expected players.options to be built from the profile directory",
);

assert.match(
  latestSource,
  /select private\.get_stats_screen_rollup[\s\S]*jsonb_set\(\s*rollup_stats,\s*'\{players,options\}'/,
  "expected the rollup branch to overwrite the stored single-entry options list",
);

// Preserved from 20260706030843 — no rewrite may widen the RPC surface.
assert.match(
  latestSource,
  /security definer/i,
  "expected get_stats_screen to stay security definer",
);

assert.match(
  latestSource,
  /raise exception 'profile_id must match the authenticated profile'/,
  "expected the caller-identity guard to survive",
);

assert.match(
  latestSource,
  /revoke all on function public\.get_stats_screen\(uuid, uuid\) from anon;/,
  "expected anon to stay revoked from get_stats_screen",
);

// Helpers run inside a search_path '' definer context, so an unqualified table
// reference would resolve to nothing at runtime.
assert.doesNotMatch(
  helperSource,
  /\bfrom\s+game_participants\b|\bjoin\s+games\b/i,
  "expected every table reference in the helpers to be schema qualified",
);

// The rollup renamed these keys; reading only the retired ones publishes four
// metrics that all read 0, which looks like data rather than an empty section.
for (const paceKey of ["avgFirstHalf", "avgSecondHalf", "avgLateDelta"]) {
  assert.ok(
    helperSource.includes(paceKey),
    `expected the form/closing cluster to read the current paceProfile key ${paceKey}`,
  );
}

assert.match(
  helperSource,
  /jsonb_typeof\(entry\.value->'value'\) = 'number'/,
  "expected metrics with no value behind them to be dropped rather than zeroed",
);

console.log("stats-phase1-cluster-restore.test.cjs passed");
