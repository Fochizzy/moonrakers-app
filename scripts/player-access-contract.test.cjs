const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migration = fs.readFileSync(
  path.join(
    projectRoot,
    "supabase",
    "migrations",
    "20260817210532_moonrakers_guest_player_authorization.sql",
  ),
  "utf8",
);
const homeSource = fs.readFileSync(path.join(projectRoot, "app", "index.tsx"), "utf8");
const registerSource = fs.readFileSync(
  path.join(projectRoot, "app", "register.tsx"),
  "utf8",
);
const settingsSource = fs.readFileSync(
  path.join(projectRoot, "app", "add-players.tsx"),
  "utf8",
);
const layoutSource = fs.readFileSync(path.join(projectRoot, "app", "_layout.tsx"), "utf8");
const missingPasscodePromptSource = fs.readFileSync(
  path.join(projectRoot, "components", "auth", "MissingPasscodePrompt.tsx"),
  "utf8",
);
const playerAccessSource = fs.readFileSync(
  path.join(projectRoot, "lib", "cloud", "playerAccess.ts"),
  "utf8",
);
const accessModalSource = fs.readFileSync(
  path.join(projectRoot, "components", "home", "PlayerAccessModal.tsx"),
  "utf8",
);

for (const username of ["RevLoki", "Fochizzy", "GregMtG", "Lurker", "Cpl_Baloo"]) {
  assert.ok(
    migration.includes(username),
    `expected the username migration to document canonical username ${username}`,
  );
}

for (const requiredSql of [
  "create table if not exists private.player_passcodes",
  "create table if not exists private.player_add_authorizations",
  "unique (host_profile_id, draft_id, subject_profile_id)",
  "create function public.create_guest_profile",
  "create function public.claim_guest_profile",
  "drop function if exists public.create_guest_profile(text, text, text, text, integer)",
  "drop function if exists public.claim_guest_profile(text, text, text)",
  "create function public.verify_player_passcode",
  "create or replace function public.remove_my_player_passcode",
  "private.save_completed_game_unverified(payload)",
  "authorization_row.expires_at > now()",
  "client_game_id is required for player authorization",
  "display_name_snapshot = null",
]) {
  assert.ok(migration.includes(requiredSql), `expected migration contract: ${requiredSql}`);
}

assert.match(
  migration,
  /v_hash is not null[\s\S]*extensions\.crypt\(v_passcode, v_hash\) = v_hash/,
  "expected missing passcodes to fail verification instead of silently authorizing",
);
assert.match(
  migration,
  /where authorization_row\.host_profile_id = v_host_id[\s\S]*authorization_row\.draft_id = v_draft_id[\s\S]*authorization_row\.subject_profile_id/,
  "expected save authorization to be tied to host, draft, and participant",
);

for (const label of ["Existing player", "Existing guest", "New guest"]) {
  assert.ok(homeSource.includes(`title="${label}"`), `expected Add to game action ${label}`);
}
assert.ok(
  homeSource.includes("verifyPlayerForGame"),
  "expected player selection to verify a passcode before adding",
);
assert.ok(
  homeSource.includes('title="Players in this game"') &&
    homeSource.includes('Alert.alert("Added to game", message)'),
  "expected a running game roster and explicit add confirmation",
);
assert.ok(
  homeSource.includes("const removePlayerFromGame") &&
    homeSource.includes("onPress={() => removePlayerFromGame(player)}") &&
    homeSource.includes('{isHost ? "HOST" : "REMOVE"}'),
  "expected selected non-host players to be removable from either the card grid or running roster",
);
assert.ok(
  registerSource.includes('key: "claim-guest"') &&
    registerSource.includes("claimGuestProfile"),
  "expected registration to expose guest claiming by username and passcode",
);
assert.ok(
  !registerSource.includes('placeholder="Display name (optional)"'),
  "expected registration to use usernames only",
);
assert.ok(
  settingsSource.includes("Change passcode") &&
    settingsSource.includes("Remove passcode") &&
    settingsSource.includes("Confirm passcode"),
  "expected profile settings to set, change, and remove passcodes with confirmation",
);
assert.ok(
  settingsSource.includes("Change username") &&
    settingsSource.includes("setMyPlayerName") &&
    playerAccessSource.includes('supabase.rpc("set_my_player_name"'),
  "expected Manage Users & Groups to change the signed-in username through an authenticated RPC",
);
assert.ok(
  layoutSource.includes("signedInProfilePlayer?.hasPasscode === false") &&
    layoutSource.includes("<MissingPasscodePrompt") &&
    missingPasscodePromptSource.includes("Add a player passcode") &&
    missingPasscodePromptSource.includes("Confirm passcode"),
  "expected login hydration to prompt usernames that have no passcode",
);

// --- naming a collision, and recognising a guest, before submit -------------

// Both username namespaces are global and neither is browsable, so a collision
// discovered on submit names a profile the user cannot see. The check has to
// happen while the field is still being typed.
assert.ok(
  playerAccessSource.includes('supabase.rpc("is_player_name_available"'),
  "expected an availability check the username fields can call while typing",
);

assert.ok(
  accessModalSource.includes('usernameAvailability === "taken"') &&
    accessModalSource.includes('usernameAvailability !== "taken"'),
  "expected the new-guest form to report and refuse a taken username",
);

assert.ok(
  registerSource.includes('nameAvailability === "taken"'),
  "expected registration to report a taken username",
);

// Claiming is one-way and cannot be replayed, so the guest is shown back before
// the form will commit to it.
assert.ok(
  playerAccessSource.includes('supabase.rpc("lookup_claimable_guest"'),
  "expected a lookup that resolves a guest username before the claim runs",
);

assert.ok(
  registerSource.includes("lookupClaimableGuest(playerName)") &&
    registerSource.includes('guestLookup !== "found"'),
  "expected claiming to be blocked until the guest actually resolves",
);

// The passcode is never recoverable afterwards, and getting it to another
// person is the entire point of creating a guest.
assert.ok(
  accessModalSource.includes('mode === "guest-created"') &&
    accessModalSource.includes("shareGuestCredentials"),
  "expected the new guest's credentials to stay on screen with a way to send them",
);

console.log("player-access-contract.test.cjs passed");
