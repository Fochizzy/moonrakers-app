const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260706030843_moonrakers_stats_focus_player_rpc.sql",
);

assert.equal(
  fs.existsSync(migrationPath),
  true,
  "expected the focused-player stats migration to exist",
);

const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /create or replace function public\.get_stats_screen\(\s*profile_id uuid default auth\.uid\(\),\s*focus_player_id uuid default null/s,
  "expected get_stats_screen to accept an optional focus_player_id",
);

assert.match(
  source,
  /security definer/,
  "expected the focused-player stats wrapper to run as security definer so it can read the selected player's rollup",
);

assert.match(
  source,
  /private\.get_stats_screen_rollup\(effective_focus_player_id\)/,
  "expected the wrapper to read the focused player's stored statsScreen payload",
);

console.log("stats-screen-focused-player-migration.test.cjs passed");
