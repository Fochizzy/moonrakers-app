const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260527201000_moonrakers_consolidate_chart_contract_cleanup.sql",
);
const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /create or replace function private\.build_personal_rollup_charts\(/i,
  "expected the consolidation migration to rebuild chart payloads alongside personal rollups",
);

assert.match(
  source,
  /create trigger personal_stats_rollups_attach_charts[\s\S]*before insert or update on public\.personal_stats_rollups/i,
  "expected the consolidation migration to attach chart payloads on every personal_stats_rollups write",
);

assert.match(
  source,
  /perform private\.admin_refresh_analytics\(profile_row\.id\);/i,
  "expected the consolidation migration to backfill existing rollups through the current analytics writer",
);

assert.match(
  source,
  /'relationship_graph'[\s\S]*'players', relationship_nodes[\s\S]*'relationships', relationship_edges/i,
  "expected the stored relationship_graph chart payload to publish both players and relationships for the chart route",
);

assert.match(
  source,
  /jsonb_each_text\(coalesce\(gr\.assist_recipients, '\{\}'::jsonb\)\)[\s\S]*rec\.profile_id::text = btrim\(edge\.key\)/i,
  "expected the relationship graph helper to rebuild raw assist flows directly from game_rounds instead of inheriting the empty assistNetwork placeholder",
);

assert.match(
  source,
  /when normalized_chart_key = 'relationship_graph' then jsonb_build_object\([\s\S]*'players'[\s\S]*'relationships'[\s\S]*'meta', effective_meta/i,
  "expected get_chart_dataset to keep relationship graph player, edge, and meta fields together",
);

assert.match(
  source,
  /effective_data := effective_data \|\| jsonb_build_object\('meta', effective_meta\);/i,
  "expected chart dataset meta to survive chart-specific shaping instead of being dropped for non-point charts",
);

assert.doesNotMatch(
  source,
  /create or replace function public\.get_player_profile_screen\(/i,
  "expected the consolidated chart cleanup migration to stay chart-only instead of reintroducing player-profile fallback rewrites",
);

console.log("chart-rollup-meta-repair.test.cjs passed");
