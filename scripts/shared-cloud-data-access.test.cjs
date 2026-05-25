const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const cloudSnapshotSource = read(path.join("lib", "cloud", "loadCloudSnapshot.ts"));
const migrationSource = read(
  path.join(
    "supabase",
    "migrations",
    "20260523021108_moonrakers_shared_authenticated_read_access.sql",
  ),
);
const registerSource = read(path.join("app", "register.tsx"));

assert.doesNotMatch(
  cloudSnapshotSource,
  /\.eq\("created_by", profileId\)/,
  "expected loadCloudSnapshot to stop filtering groups down to the signed-in creator",
);

assert.match(
  cloudSnapshotSource,
  /\.order\("name", \{ ascending: true \}\)/,
  "expected loadCloudSnapshot to keep saved groups ordered after removing the creator filter",
);

assert.match(
  registerSource,
  /loadCloudSnapshot\(authSession\.user\.id\)/,
  "expected finish-profile registration to reload the shared cloud snapshot after creating the profile row",
);

assert.match(
  registerSource,
  /hydrateCloudSnapshot\(\{/,
  "expected finish-profile registration to hydrate the shared store immediately instead of waiting for a later auth refresh",
);

for (const policyName of [
  "groups_select_authenticated",
  "games_select_authenticated",
  "game_participants_select_authenticated",
  "game_rounds_select_authenticated",
  "group_stats_rollups_select_authenticated",
]) {
  assert.match(
    migrationSource,
    new RegExp(`create policy "${policyName}"`, "i"),
    `expected shared authenticated read policy ${policyName} to be present in the migration`,
  );
}

console.log("shared-cloud-data-access.test.cjs passed");
