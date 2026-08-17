const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const migration = read(
  path.join(
    "supabase",
    "migrations",
    "20260817211401_moonrakers_verified_group_fast_setup.sql",
  ),
);
const helperSource = read(path.join("lib", "cloud", "sharedGroups.ts"));
const homeSource = read(path.join("app", "index.tsx"));
const groupsScreenSource = read(path.join("app", "add-players.tsx"));
const accessModalSource = read(
  path.join("components", "home", "PlayerAccessModal.tsx"),
);

for (const requiredSql of [
  "create table private.group_member_authorizations",
  "primary key (group_id, profile_id)",
  "create or replace function public.create_verified_group",
  "create or replace function public.is_group_authorized_for_fast_setup",
  "create or replace function public.authorize_group_for_fast_setup",
  "Group authorization expired. Re-enter each player passcode",
  "delete from private.group_member_authorizations",
  "v_requested_group_id uuid",
  "not v_group_authorized",
]) {
  assert.ok(migration.includes(requiredSql), `expected verified group SQL: ${requiredSql}`);
}

assert.match(
  migration,
  /create_verified_group[\s\S]*player_add_authorizations[\s\S]*expires_at > now\(\)[\s\S]*insert into public\.groups[\s\S]*insert into private\.group_member_authorizations/,
  "expected group creation to verify every short-lived grant before atomically creating durable authorization rows",
);
assert.match(
  migration,
  /remove_my_player_passcode[\s\S]*delete from private\.group_member_authorizations[\s\S]*where profile_id = v_user_id/,
  "expected removing a player passcode to revoke their durable group approvals",
);
assert.match(
  migration,
  /save_completed_game\(payload jsonb\)[\s\S]*group_member_authorizations[\s\S]*jsonb_array_elements[\s\S]*Player authorization expired/,
  "expected completed-game save enforcement to accept only a matching verified group or fresh draft grants",
);

for (const rpcName of [
  "create_verified_group",
  "is_group_authorized_for_fast_setup",
  "authorize_group_for_fast_setup",
]) {
  assert.ok(
    helperSource.includes(`"${rpcName}"`),
    `expected shared group helper to call ${rpcName}`,
  );
}

assert.ok(
  groupsScreenSource.includes("verifyPlayerForGame") &&
    groupsScreenSource.includes("createVerifiedSharedGroup") &&
    groupsScreenSource.includes('purpose="group"') &&
    groupsScreenSource.includes("Verify & Save Group"),
  "expected new group saving to collect member passcodes before the verified RPC",
);
assert.ok(
  accessModalSource.includes("Each member approves this saved group once") &&
    accessModalSource.includes("future setup can load the unchanged group"),
  "expected the group passcode modal to explain one-time verification",
);
assert.ok(
  homeSource.includes("isGroupFastSetupAuthorized") &&
    homeSource.includes("authorizeSharedGroupForFastSetup") &&
    homeSource.includes("await finishPendingGroupAuthorization(pendingAccessGroup)"),
  "expected first legacy-group use to verify and promote the group while later uses load immediately",
);

console.log("verified-group-fast-setup.test.cjs passed");
