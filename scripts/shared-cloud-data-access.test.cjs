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
const addPlayersSource = read(path.join("app", "add-players.tsx"));

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
  /loadHydratedCloudState|loadHydratedSharedSnapshot/,
  "expected finish-profile registration to use the shared cloud rehydration helper",
);

assert.match(
  registerSource,
  /hydrateCloudSnapshot\(\s*hydratedSnapshot\s*\)/,
  "expected finish-profile registration to hydrate the shared store from the shared helper payload",
);

assert.doesNotMatch(
  registerSource,
  /loadCloudSnapshot\(authSession\.user\.id\)/,
  "expected finish-profile registration to stop reloading the cloud snapshot inline",
);

assert.match(
  addPlayersSource,
  /loadHydratedCloudState|loadHydratedSharedSnapshot/,
  "expected add-players shared-group refreshes to use the shared cloud rehydration helper",
);

assert.match(
  addPlayersSource,
  /hydrateCloudSnapshot\(\s*hydratedSnapshot\s*\)/,
  "expected add-players shared-group refreshes to hydrate from the shared helper payload",
);

assert.doesNotMatch(
  addPlayersSource,
  /loadCloudSnapshot\(signedInUserId\)/,
  "expected add-players shared-group refreshes to stop reloading the cloud snapshot inline",
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
