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
const normalize = (value) => value.replace(/\r\n/g, "\n");
const normalizedSource = normalize(source);

const createdGroupPolicies = Array.from(
  normalizedSource.matchAll(/create policy "([^"]+)"\s+on public\.groups/gi),
  (match) => match[1],
);

assert.deepEqual(
  createdGroupPolicies,
  [
    "groups_insert_self_created",
    "groups_update_own",
    "groups_delete_group_members",
  ],
  "expected the migration to create only the intended public.groups policies in order",
);

assert.match(
  normalizedSource,
  /drop policy if exists "groups_manage_own" on public\.groups;/i,
  "expected the migration to remove the legacy creator-owned FOR ALL policy",
);

assert.match(
  normalizedSource,
  /drop policy if exists "groups_insert_self_created" on public\.groups;/i,
  "expected the migration to drop the insert policy before recreating it",
);

assert.match(
  normalizedSource,
  /drop policy if exists "groups_update_own" on public\.groups;/i,
  "expected the migration to drop the update policy before recreating it",
);

assert.match(
  normalizedSource,
  /drop policy if exists "groups_delete_group_members" on public\.groups;/i,
  "expected the migration to drop the delete policy before recreating it",
);

assert.doesNotMatch(
  normalizedSource,
  /on public\.groups[\s\S]*for all/i,
  "expected the migration to avoid recreating a FOR ALL policy on public.groups",
);

assert.match(
  normalizedSource,
  /create policy "groups_insert_self_created"[\s\S]*for insert[\s\S]*with check \(\(select auth\.uid\(\)\) = created_by\);/i,
  "expected the migration to keep shared-group inserts tied to the signed-in creator",
);

assert.match(
  normalizedSource,
  /create policy "groups_update_own"[\s\S]*for update[\s\S]*using \(\(select auth\.uid\(\)\) = created_by\)[\s\S]*with check \(\(select auth\.uid\(\)\) = created_by\);/i,
  "expected the migration to keep shared-group updates creator-owned",
);

assert.match(
  normalizedSource,
  /create policy "groups_delete_group_members"[\s\S]*for delete[\s\S]*from public\.group_members[\s\S]*public\.group_members\.group_id = groups\.id[\s\S]*public\.group_members\.profile_id = \(select auth\.uid\(\)\)/i,
  "expected the migration to authorize shared-group deletes through current membership",
);

assert.match(
  normalizedSource,
  /create policy "groups_delete_group_members"[\s\S]*created_by = \(select auth\.uid\(\)\)[\s\S]*not exists \(\s*select 1\s*from public\.group_members\s*where public\.group_members\.group_id = groups\.id/i,
  "expected the migration to preserve creator cleanup for zero-member rollback groups",
);

console.log("shared-groups-member-delete-policy.test.cjs passed");
