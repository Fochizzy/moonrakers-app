const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260527213500_moonrakers_player_profile_private_schema_wrapper.sql",
);

assert.equal(
  fs.existsSync(migrationPath),
  true,
  "expected a follow-up migration that routes player-profile Moonrakers Intel through a private-schema-safe wrapper",
);

const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /create or replace function public\.get_player_profile_moonrakers_intel\(/i,
  "expected the repair to add a public wrapper for the player-profile Moonrakers Intel payload",
);

assert.match(
  source,
  /security definer[\s\S]*viewer_profile_id uuid := coalesce\(profile_id, auth\.uid\(\)\);[\s\S]*if viewer_profile_id is null or viewer_profile_id <> \(select auth\.uid\(\)\) then/i,
  "expected the wrapper to run as security definer while still enforcing the authenticated viewer guard",
);

assert.match(
  source,
  /private\.build_moonrakers_intel_payload\([\s\S]*target_profile_id,[\s\S]*opponent_id[\s\S]*private\.build_most_common_assist_target_summary\([\s\S]*target_profile_id,[\s\S]*opponent_id/i,
  "expected the wrapper to own the private-schema calls for both the base intel payload and the restored mostCommonAssistTarget summary",
);

assert.match(
  source,
  /grant execute on function public\.get_player_profile_moonrakers_intel\(uuid, uuid, uuid\) to authenticated;/i,
  "expected authenticated callers to retain execute access to the new wrapper",
);

assert.match(
  source,
  /public\.get_player_profile_moonrakers_intel\(profile_id, selected_player_id, selected_opponent_id\)/i,
  "expected the follow-up patch to replace the direct private opponent-filtered call inside get_player_profile_screen",
);

assert.match(
  source,
  /public\.get_player_profile_moonrakers_intel\(profile_id, selected_player_id, null\)/i,
  "expected the follow-up patch to replace the direct private all-games fallback inside get_player_profile_screen",
);

assert.match(
  source,
  /Could not restore private-schema-safe player profile RPC wrapper\./i,
  "expected the migration to fail loudly if get_player_profile_screen drifts away from the patchable shape",
);

console.log("player-profile-private-schema-wrapper.test.cjs passed");
