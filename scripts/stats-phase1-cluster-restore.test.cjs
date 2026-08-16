// Guards the restore of the phase-1 stats clusters.
//
// 20260527143000 published overview.formClosing, players.detail.pressureContext,
// games.turnOrder*, and correlations.turnOrderSummary by wrapping
// get_stats_screen. 20260706030843 dropped and recreated that function for the
// focus_player_id signature and returned the rollup straight through, so all
// four sections silently went blank in the app for every player. The rollup
// contract guard only reads the 20260527143000 file, so it stayed green through
// the whole regression — this guard watches the live definition instead.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");
const restoreMigration = "20260816154458_moonrakers_restore_phase1_stats_clusters.sql";
const restorePath = path.join(migrationsDir, restoreMigration);

assert.equal(
  fs.existsSync(restorePath),
  true,
  `expected ${restoreMigration} to exist`,
);

const restoreSource = fs.readFileSync(restorePath, "utf8");

// The restore has to be the newest migration that touches get_stats_screen, or
// an older definition wins and the clusters go blank again.
const statsScreenMigrations = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .filter((file) =>
    /create or replace function\s+public\.get_stats_screen/i.test(
      fs.readFileSync(path.join(migrationsDir, file), "utf8"),
    ),
  )
  .sort();

assert.equal(
  statsScreenMigrations.at(-1),
  restoreMigration,
  "expected the cluster restore to be the last migration that defines get_stats_screen",
);

for (const helper of [
  "private.phase1_form_closing_cluster",
  "private.phase1_pressure_context_cluster",
  "private.phase1_turn_order_overview",
  "private.phase1_turn_order_by_table_size",
  "private.phase1_turn_order_summary",
]) {
  assert.match(
    restoreSource,
    new RegExp(`create or replace function\\s+${helper.replace(".", "\\.")}`, "i"),
    `expected the restore to recreate ${helper}`,
  );
}

for (const jsonPath of [
  "{overview,formClosing}",
  "{players,detail,pressureContext}",
  "{games,turnOrderOverview}",
  "{games,turnOrderByTableSize}",
  "{correlations,turnOrderSummary}",
]) {
  assert.ok(
    restoreSource.includes(`'${jsonPath}'`),
    `expected the restore to publish ${jsonPath}`,
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
    restoreSource,
    focusedCall,
    "expected the restored clusters to be keyed on the focused player",
  );
}

assert.doesNotMatch(
  restoreSource,
  /phase1_[a-z_]+\(\s*requester_profile_id\s*\)/,
  "expected no cluster to be keyed on the requesting profile",
);

// Preserved from 20260706030843 — the restore must not widen the RPC surface.
assert.match(
  restoreSource,
  /security definer/i,
  "expected get_stats_screen to stay security definer",
);

assert.match(
  restoreSource,
  /raise exception 'profile_id must match the authenticated profile'/,
  "expected the restore to keep the caller-identity guard",
);

assert.match(
  restoreSource,
  /revoke all on function public\.get_stats_screen\(uuid, uuid\) from anon;/,
  "expected anon to stay revoked from get_stats_screen",
);

// Every helper runs inside a search_path '' definer context, so unqualified
// table references would resolve to nothing at runtime.
assert.doesNotMatch(
  restoreSource,
  /\bfrom\s+game_participants\b|\bjoin\s+games\b/i,
  "expected every table reference in the restored helpers to be schema qualified",
);

// The rollup renamed these keys; reading only the retired ones publishes four
// metrics that all read 0, which looks like data rather than an empty section.
for (const paceKey of ["avgFirstHalf", "avgSecondHalf", "avgLateDelta"]) {
  assert.ok(
    restoreSource.includes(paceKey),
    `expected the form/closing cluster to read the current paceProfile key ${paceKey}`,
  );
}

assert.match(
  restoreSource,
  /jsonb_typeof\(entry\.value->'value'\) = 'number'/,
  "expected metrics with no value behind them to be dropped rather than zeroed",
);

console.log("stats-phase1-cluster-restore.test.cjs passed");
