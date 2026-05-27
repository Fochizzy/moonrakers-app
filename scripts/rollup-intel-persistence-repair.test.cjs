const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260527181654_moonrakers_persist_rollup_intel_and_assist_network.sql",
);
const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /create or replace function private\.build_personal_rollup_assist_network\(/i,
  "expected the follow-up migration to centralize raw assist-network rebuilding for stored rollups",
);

assert.match(
  source,
  /create or replace function private\.build_personal_rollup_moonrakers_intel\(/i,
  "expected the follow-up migration to persist Moonrakers Intel directly on the stored rollup payload",
);

assert.match(
  source,
  /create or replace function private\.build_personal_rollup_charts\([\s\S]*private\.build_personal_rollup_assist_network\(target_profile_id, base_payload\)/i,
  "expected the relationship_graph chart payload to share the same raw assist-network helper as the stored insights branch",
);

assert.match(
  source,
  /relationship_payload := private\.build_personal_rollup_assist_network\(new\.profile_id, new\.payload\);/i,
  "expected the rollup trigger to rebuild assist-network data during every personal_stats_rollups write",
);

assert.match(
  source,
  /moonrakers_intel := private\.build_personal_rollup_moonrakers_intel\(new\.profile_id\);/i,
  "expected the rollup trigger to persist Moonrakers Intel during every personal_stats_rollups write",
);

assert.match(
  source,
  /insights_screen := insights_screen \|\| jsonb_build_object\(\s*'assistNetwork', assist_network\s*\);/i,
  "expected the stored insightsScreen payload to receive the rebuilt assist network instead of keeping the empty placeholder",
);

assert.match(
  source,
  /'moonrakersIntel', moonrakers_intel[\s\S]*'insightsScreen', insights_screen[\s\S]*'charts', existing_charts \|\| rebuilt_charts/i,
  "expected the trigger to persist the intel branch, insights assist network, and chart rollups together",
);

assert.match(
  source,
  /Aggregate assist totals only/i,
  "expected the stored Moonrakers Intel payload to keep the safer aggregate-only assist context wording",
);

assert.match(
  source,
  /perform private\.admin_refresh_analytics\(profile_row\.id\);/i,
  "expected the follow-up migration to backfill all current profiles through the existing refresh path",
);

console.log("rollup-intel-persistence-repair.test.cjs passed");
