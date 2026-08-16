const fs = require("node:fs");
const assert = require("node:assert/strict");
const path = require("node:path");

// Guards must resolve files relative to the repo, not this machine.
const projectRoot = path.resolve(__dirname, "..");

const migrationPath =
  path.join(projectRoot, "supabase/migrations/20260525164000_moonrakers_user_game_drafts.sql");
const saveHelperPath =
  path.join(projectRoot, "lib/cloud/game-drafts/saveUserGameDraft.ts");

assert.ok(fs.existsSync(migrationPath), "expected the draft migration file to exist");
assert.ok(fs.existsSync(saveHelperPath), "expected the save helper to exist");

const migration = fs.readFileSync(migrationPath, "utf8");
assert.match(migration, /create table public\.user_game_drafts/i);
assert.match(migration, /profile_id uuid primary key/i);
assert.match(migration, /phase text not null/i);
assert.match(migration, /payload jsonb not null/i);
assert.match(migration, /alter table public\.user_game_drafts enable row level security/i);

const saveSource = fs.readFileSync(saveHelperPath, "utf8");
assert.match(saveSource, /\.from\("user_game_drafts"\)/);
assert.match(saveSource, /upsert\(/);
assert.match(saveSource, /onConflict:\s*"profile_id"/);

console.log("game-draft-cloud-contract.test.cjs passed");
