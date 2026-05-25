const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");
const migrationNameSuffix = "_moonrakers_save_completed_game_group_rollup_fix.sql";
const migrationName = fs
  .readdirSync(migrationsDir)
  .find((entry) => entry.endsWith(migrationNameSuffix));

const migrationPath = migrationName ? path.join(migrationsDir, migrationName) : null;

assert.equal(
  migrationPath ? fs.existsSync(migrationPath) : false,
  true,
  "expected the save-completed-game follow-up migration file to exist",
);

const source = fs.readFileSync(migrationPath, "utf8").replace(/\r\n/g, "\n");

assert.match(
  source,
  /create or replace function public\.save_completed_game\(payload jsonb\)/i,
  "expected the migration to replace the public save_completed_game function",
);

assert.match(
  source,
  /saved_group_id uuid;/i,
  "expected the migration to rename the local group variable to avoid PL\\/pgSQL ambiguity",
);

assert.match(
  source,
  /where public\.games\.group_id = saved_group_id/i,
  "expected group rollup counts to compare against the renamed local group id variable",
);

assert.doesNotMatch(
  source,
  /where public\.games\.group_id = group_id/i,
  "expected the migration to remove the ambiguous group_id reference that breaks save_completed_game",
);

console.log("save-completed-game-migration.test.cjs passed");
