const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationNameSuffix = "_moonrakers_finish_game_timeout_relief.sql";
const migrationsDir = path.join(projectRoot, "supabase", "migrations");

const migrationName = fs
  .readdirSync(migrationsDir)
  .find((entry) => entry.endsWith(migrationNameSuffix));

assert.ok(
  migrationName,
  `expected a migration ending with ${migrationNameSuffix} to exist`,
);

const migration = fs.readFileSync(path.join(migrationsDir, migrationName), "utf8");

assert.match(
  migration,
  /create or replace function private\.refresh_completed_game_participant_rollup/i,
  "expected the migration to add a private participant-rollup refresh helper",
);

assert.match(
  migration,
  /create or replace function public\.refresh_completed_game_participant_rollup/i,
  "expected the migration to expose the participant-rollup refresh helper through a public RPC wrapper",
);

assert.match(
  migration,
  /create or replace function public\.refresh_completed_game_participant_rollup\(\s*target_game_id uuid,\s*target_profile_id uuid\s*\)\s*returns jsonb\s*language sql\s*security definer/i,
  "expected the public participant-rollup refresh RPC wrapper to run with definer permissions so authenticated callers do not need direct access to the private schema",
);

assert.match(
  migration,
  /create or replace function public\.refresh_elo_rollups/i,
  "expected the migration to expose a dedicated ELO refresh RPC wrapper",
);

assert.match(
  migration,
  /create or replace function public\.refresh_elo_rollups\(\)\s*returns jsonb\s*language sql\s*security definer/i,
  "expected the public ELO refresh RPC wrapper to run with definer permissions so authenticated callers do not need direct access to the private schema",
);

const saveCompletedGameMatch = migration.match(
  /create or replace function public\.save_completed_game\(payload jsonb\)([\s\S]*?)\n\$\$;/i,
);

assert.ok(
  saveCompletedGameMatch,
  "expected the migration to replace public.save_completed_game",
);

const saveCompletedGameSource = saveCompletedGameMatch[1];

assert.doesNotMatch(
  saveCompletedGameSource,
  /perform private\.admin_refresh_analytics/i,
  "expected save_completed_game to stop running participant analytics rollups inline",
);

assert.doesNotMatch(
  saveCompletedGameSource,
  /perform private\.post_process_analytics/i,
  "expected save_completed_game to stop running post-process analytics inline",
);

assert.doesNotMatch(
  saveCompletedGameSource,
  /perform private\.refresh_all_elo_snapshots\(\)/i,
  "expected save_completed_game to stop replaying ELO inline",
);

assert.doesNotMatch(
  saveCompletedGameSource,
  /save_completed_game\.client_game_id|save_completed_game\.host_profile_id/i,
  "expected save_completed_game to stop qualifying PL/pgSQL variables as if the function name were a table alias",
);

console.log("finish-game-timeout-migration.test.cjs passed");
