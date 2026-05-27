const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const migrationSource = read(
  path.join(
    "supabase",
    "migrations",
    "20260513113000_moonrakers_soft_delete_profiles.sql",
  ),
);
const registerSource = read(path.join("app", "register.tsx"));
const authBootstrapSource = read(
  path.join("lib", "auth", "bootstrapSharedCloudState.ts"),
);
const registeredProfilesSource = read(
  path.join("lib", "cloud", "loadRegisteredProfiles.ts"),
);
const normalizeSnapshotSource = read(
  path.join("lib", "cloud", "normalizeCloudSnapshot.ts"),
);

assert.match(
  migrationSource,
  /add column if not exists deleted_at timestamptz/i,
  "expected the profile-delete migration to add a soft-delete timestamp"
);

assert.match(
  migrationSource,
  /create or replace function public\.delete_my_profile\(\)/i,
  "expected the profile-delete migration to add a delete_my_profile RPC"
);

assert.match(
  migrationSource,
  /player_name_snapshot\s*=\s*replacement_name/i,
  "expected the delete RPC to rewrite participant history to the anonymized name"
);

assert.match(
  migrationSource,
  /profile_id\s*=\s*null/i,
  "expected the delete RPC to detach historical participants from the deleted profile id"
);

assert.match(
  migrationSource,
  /alter table public\.games\s+alter column host_profile_id drop not null/i,
  "expected the profile-delete migration to make hosted games survive account deletion"
);

assert.match(
  migrationSource,
  /update public\.games\s+set host_profile_id = null/i,
  "expected the delete RPC to detach hosted games before removing the auth user"
);

assert.match(
  migrationSource,
  /delete from auth\.users/i,
  "expected the delete RPC to fully remove the Supabase auth user"
);

assert.match(
  migrationSource,
  /deleted_at is null/i,
  "expected the migration to filter soft-deleted profiles out of profile search"
);

assert.match(
  registerSource,
  /deleted_at:\s*null/,
  "expected app/register.tsx to reactivate a soft-deleted profile row on save"
);

assert.match(
  authBootstrapSource,
  /\.is\("deleted_at", null\)/,
  "expected the shared auth bootstrap loader to ignore soft-deleted auth profiles"
);

assert.match(
  registeredProfilesSource,
  /\.is\("deleted_at", null\)/,
  "expected loadRegisteredProfiles to exclude soft-deleted profiles"
);

assert.doesNotMatch(
  normalizeSnapshotSource,
  /participants\.find\(\(participant\) => participant\.is_winner\)\?\.profile_id/,
  "expected normalizeCloudSnapshot to stop depending on winner profile ids that are nulled during anonymized deletes"
);

assert.match(
  normalizeSnapshotSource,
  /resolvePlayerId\(winnerParticipant\)/,
  "expected normalizeCloudSnapshot to preserve winner identity via the anonymized participant snapshot"
);

console.log("profile-delete-anonymize-regression.test.cjs passed");
