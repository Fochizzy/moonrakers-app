const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260527202100_moonrakers_restore_most_common_assist_target.sql",
);
const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /create or replace function private\.build_most_common_assist_target_summary\(/i,
  "expected the follow-up migration to add a shared helper for the restored mostCommonAssistTarget summary",
);

assert.match(
  source,
  /create or replace function private\.build_most_common_assist_target_summary\([\s\S]*from assist_events as ae[\s\S]*join public\.profiles as target_profile on target_profile\.id = ae\.target_player_id/i,
  "expected the repair to rebuild mostCommonAssistTarget from the exact timed assist events",
);

assert.match(
  source,
  /jsonb_build_object\([\s\S]*'playerId', ae\.target_player_id[\s\S]*'playerName', coalesce\(nullif\(target_profile\.display_name, ''\), target_profile\.player_name, 'Player'\)[\s\S]*'assistsSent', count\(\*\)::int[\s\S]*'assistsSentLabel', count\(\*\)::int::text[\s\S]*'sampleSize', count\(distinct ae\.game_id\)::int[\s\S]*'sampleSizeLabel', format\('%s games', count\(distinct ae\.game_id\)::int\)/i,
  "expected the repaired payload to publish the same assist target fields the support card renders",
);

assert.match(
  source,
  /order by[\s\S]*count\(\*\)::int desc,[\s\S]*count\(distinct ae\.game_id\)::int desc,[\s\S]*lower\(coalesce\(nullif\(target_profile\.display_name, ''\), target_profile\.player_name, 'Player'\)\) asc/i,
  "expected mostCommonAssistTarget ranking to prefer more assists, then more assist games, then a stable player-name tie-break",
);

assert.match(
  source,
  /base_payload jsonb := private\.build_moonrakers_intel_payload\(target_profile_id, null\);[\s\S]*return jsonb_set\([\s\S]*'\{supportProfile,mostCommonAssistTarget\}'[\s\S]*private\.build_most_common_assist_target_summary\(target_profile_id, null\)/i,
  "expected stored rollups to patch the shared Moonrakers payload with the restored mostCommonAssistTarget summary",
);

assert.match(
  source,
  /moonrakers_intel := jsonb_set\([\s\S]*'\{supportProfile,mostCommonAssistTarget\}'[\s\S]*private\.build_most_common_assist_target_summary\(selected_player_id, selected_opponent_id\)/i,
  "expected the live player-profile payload to reuse the same mostCommonAssistTarget helper, including opponent-filtered views",
);

assert.match(
  source,
  /perform private\.admin_refresh_analytics\(profile_row\.id\);/i,
  "expected the repair migration to backfill stored rollups after restoring mostCommonAssistTarget",
);

console.log("most-common-assist-target-repair.test.cjs passed");
