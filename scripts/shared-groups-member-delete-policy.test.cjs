const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260523160000_moonrakers_member_delete_cloud_only_groups.sql",
);

assert.equal(
  fs.existsSync(migrationPath),
  true,
  "expected the member-delete migration file to exist",
);

const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /drop policy if exists "groups_manage_own" on public\.groups;/i,
  "expected the migration to remove the legacy creator-owned FOR ALL policy",
);

assert.match(
  source,
  /create policy "groups_insert_self_created"[\s\S]*for insert[\s\S]*with check \(\(select auth\.uid\(\)\) = created_by\);/i,
  "expected the migration to keep shared-group inserts tied to the signed-in creator",
);

assert.match(
  source,
  /create policy "groups_update_own"[\s\S]*for update[\s\S]*using \(\(select auth\.uid\(\)\) = created_by\)[\s\S]*with check \(\(select auth\.uid\(\)\) = created_by\);/i,
  "expected the migration to keep shared-group updates creator-owned",
);

assert.match(
  source,
  /create policy "groups_delete_group_members"[\s\S]*for delete[\s\S]*from public\.group_members[\s\S]*public\.group_members\.group_id = groups\.id[\s\S]*public\.group_members\.profile_id = \(select auth\.uid\(\)\)/i,
  "expected the migration to authorize shared-group deletes through current membership",
);

console.log("shared-groups-member-delete-policy.test.cjs passed");
