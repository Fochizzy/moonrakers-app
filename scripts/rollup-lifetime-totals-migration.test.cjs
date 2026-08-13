const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260813140000_moonrakers_restore_rollup_lifetime_totals.sql",
);

assert.ok(
  fs.existsSync(migrationPath),
  "expected the rollup lifetime totals migration to exist",
);

const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /create or replace function private\.admin_refresh_analytics/i,
  "expected the migration to recreate the rollup builder",
);

// The regression: get_elo_screen and the elo snapshot builder both read these two
// keys, and both silently coalesce a missing key to 0.
for (const key of ["totalScore", "totalPrestige"]) {
  assert.ok(
    source.includes(`'${key}', lifetime_${key === "totalScore" ? "score" : "prestige"}`),
    `expected the player detail stats object to publish ${key}`,
  );
}

assert.match(
  source,
  /lifetime_score numeric := 0;/,
  "expected lifetime_score to be declared",
);

assert.match(
  source,
  /lifetime_prestige numeric := 0;/,
  "expected lifetime_prestige to be declared",
);

// Totals must be scoped to finished games, matching how finished_game_count is built.
assert.match(
  source,
  /into lifetime_score, lifetime_prestige, avg_score_per_game[\s\S]{0,400}?g\.status = 'finished'/,
  "expected lifetime totals to be restricted to finished games",
);

// The keys the previous revision kept must survive this rewrite.
for (const key of ["games", "wins", "winRate", "playerRows", "avgPrestige", "contractConversion"]) {
  assert.ok(
    source.includes(`'${key}',`),
    `expected the stats object to still publish ${key}`,
  );
}

// The trailing backfill is what repopulates existing rollups; without it the fix
// only takes effect the next time a player finishes a game.
assert.match(
  source,
  /perform private\.admin_refresh_analytics\(p\.id\);/,
  "expected the migration to backfill existing rollups",
);

console.log("rollup-lifetime-totals-migration.test.cjs passed");
