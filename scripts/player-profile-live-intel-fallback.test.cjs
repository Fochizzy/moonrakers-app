const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");
const migrationName = fs
  .readdirSync(migrationsDir)
  .sort()
  .find((name) =>
    name.includes("moonrakers_player_profile_live_intel_fallback"),
  );

assert.ok(
  migrationName,
  "expected a follow-up migration that restores live Moonrakers Intel fallback in get_player_profile_screen",
);

const source = fs.readFileSync(path.join(migrationsDir, migrationName), "utf8");

assert.match(
  source,
  /create or replace function public\.get_player_profile_screen/i,
  "expected the follow-up migration to patch get_player_profile_screen directly",
);

for (const snippet of [
  "moonrakers_game_count",
  "moonrakers_intel",
  "selected_player_id",
  "g.status='finished'",
  "hasData",
]) {
  assert.ok(
    source.includes(snippet),
    `expected ${path.basename(migrationName)} to contain ${snippet}`,
  );
}

assert.match(
  source,
  /selected_opponent_id is not null or rollup_payload is null or moonrakers_intel is null or coalesce\(\(moonrakers_intel->>'hasData'\)::boolean,\s*false\)=false/i,
  "expected the profile screen to recalculate live totals when the selected player's rollup is missing or still claims no intel data",
);

assert.match(
  source,
  /if moonrakers_intel is null or coalesce\(\(moonrakers_intel->>'hasData'\)::boolean,\s*false\)=false then[\s\S]*if moonrakers_game_count < 3 then[\s\S]*'hasData', false[\s\S]*else[\s\S]*'hasData', true/i,
  "expected the profile screen to rebuild Moonrakers Intel live from finished-game history when the rollup cannot serve the selected player",
);

console.log("player-profile-live-intel-fallback.test.cjs passed");
