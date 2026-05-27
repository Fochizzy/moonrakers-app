const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260527202000_moonrakers_restore_exact_assist_intel_contract.sql",
);
const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /create or replace function private\.build_moonrakers_intel_payload\(/i,
  "expected a shared Moonrakers Intel helper so stored rollups and player-profile fallback reuse the same exact assist-context rules",
);

assert.match(
  source,
  /create or replace function private\.build_personal_rollup_moonrakers_intel\([\s\S]*private\.build_moonrakers_intel_payload\(target_profile_id, null\)/i,
  "expected the personal rollup intel builder to delegate to the shared Moonrakers Intel helper",
);

assert.match(
  source,
  /create or replace function public\.get_player_profile_screen\(/i,
  "expected the follow-up migration to patch get_player_profile_screen so its live fallback matches the restored assist-context contract",
);

assert.match(
  source,
  /moonrakers_intel := private\.build_moonrakers_intel_payload\(selected_player_id, selected_opponent_id\);/i,
  "expected the player-profile fallback to reuse the shared exact assist-context helper instead of the older aggregate-only rebuild",
);

assert.match(
  source,
  /tracked_rounds as \([\s\S]*assist_recipients[\s\S]*assist_prestige_recipients/i,
  "expected the shared helper to rebuild timed assist context directly from tracked round payloads",
);

assert.match(
  source,
  /join lateral generate_series\(\s*1\s*,\s*greatest\(edge\.value::int\s*,\s*0\)\s*\)\s+as rep\(idx\) on true/i,
  "expected the assist-context rebuild to expand per-assist events for gap and timing metrics",
);

assert.match(
  source,
  /'assistGapToTargetLabel'[\s\S]*'assistGapToLeaderLabel'[\s\S]*'assistsAtSixPlusLabel'[\s\S]*'assistsOverFiveBehindLeaderLabel'[\s\S]*'assistPrestigeGainedLabel'[\s\S]*'assistPrestigePerAssistLabel'/i,
  "expected the restored payload to publish the full timed assist-context fields the UI already renders",
);

assert.match(
  source,
  /'importHealthLabel', case when timed_assist_events_count > 0 then 'Exact assist timing' else 'No assist context' end/i,
  "expected the restored server payload to use Exact assist timing only when tracked timed events exist",
);

assert.doesNotMatch(
  source,
  /Aggregate assist totals only|Directional assist-target timing is intentionally omitted in this safe fallback\./i,
  "expected the aggregate-only assist fallback wording to be removed from the restored exact assist-context migration",
);

assert.match(
  source,
  /perform private\.admin_refresh_analytics\(profile_row\.id\);/i,
  "expected the follow-up migration to backfill existing rollups after restoring exact assist-context metrics",
);

console.log("exact-assist-context-restore.test.cjs passed");
