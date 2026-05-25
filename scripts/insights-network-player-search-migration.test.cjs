const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");
const fileName = fs
  .readdirSync(migrationsDir)
  .sort()
  .find((name) => name.includes("moonrakers_insights_network_player_search"));

assert.ok(
  fileName,
  "expected a follow-up migration that lets Personal Correlations query a shared network player",
);

const source = fs.readFileSync(path.join(migrationsDir, fileName), "utf8");

assert.match(
  source,
  /create or replace function public\.get_insights_screen/i,
  "expected the migration to patch get_insights_screen directly",
);

assert.match(
  source,
  /viewer_profile_id uuid := auth\.uid\(\);/i,
  "expected the migration to track the authenticated viewer separately from the selected profile",
);

assert.match(
  source,
  /profile_id must match the authenticated profile or a shared network player/i,
  "expected the migration to gate alternate Personal Correlations views to the viewer's shared network",
);

assert.match(
  source,
  /target_profile_id = viewer_profile_id[\s\S]*or exists \([\s\S]*viewer_gp\.profile_id = viewer_profile_id/i,
  "expected alternate Personal Correlations views to be limited to finished games shared with the viewer",
);

assert.doesNotMatch(
  source,
  /raise exception 'profile_id must match the authenticated profile';/i,
  "expected the old self-only Personal Correlations guard to be removed",
);

console.log("insights-network-player-search-migration.test.cjs passed");
