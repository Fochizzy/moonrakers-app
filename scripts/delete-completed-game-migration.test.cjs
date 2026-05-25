const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260523191500_moonrakers_delete_completed_game.sql",
);

assert.equal(
  fs.existsSync(migrationPath),
  true,
  "expected the delete-completed-game migration file to exist",
);

const source = fs.readFileSync(migrationPath, "utf8").replace(/\r\n/g, "\n");

assert.match(
  source,
  /create or replace function private\.delete_completed_game\(target_game_id uuid\)/i,
  "expected the migration to add a private security-definer delete function",
);

assert.match(
  source,
  /create or replace function public\.delete_completed_game\(target_game_id uuid\)/i,
  "expected the migration to add a public delete wrapper function",
);

assert.match(
  source,
  /delete from public\.games/i,
  "expected the migration to delete the game from public.games",
);

assert.match(
  source,
  /only the host can delete this game/i,
  "expected the migration to keep finished-game deletes host-owned",
);

assert.match(
  source,
  /global_stats_rollups/i,
  "expected the migration to refresh global stats rollups after deleting a game",
);

assert.match(
  source,
  /group_stats_rollups/i,
  "expected the migration to refresh group stats rollups after deleting a game",
);

assert.match(
  source,
  /grant execute on function public\.delete_completed_game\(uuid\) to authenticated;/i,
  "expected authenticated users to be able to call the public delete wrapper",
);

console.log("delete-completed-game-migration.test.cjs passed");
