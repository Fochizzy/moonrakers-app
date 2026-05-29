const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260529121000_moonrakers_elo_bonus_score_blend.sql",
);
const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /coalesce\(gp\.score, 0\)::numeric - coalesce\(gp\.total_prestige, 0\)::numeric/,
  "expected Supabase ELO replay to derive bonus score from score minus total prestige",
);

assert.match(
  source,
  /elo_result_weight constant numeric := 0\.8;[\s\S]*elo_bonus_score_weight constant numeric := 0\.2;/,
  "expected Supabase ELO replay to keep wins primary while giving bonus score a smaller weight",
);

assert.match(
  source,
  /base_actual := case[\s\S]*winner_id::text = pid then 1\.0[\s\S]*else 0\.0[\s\S]*end;/,
  "expected Supabase ELO replay to keep win and loss outcome as the primary base result",
);

assert.match(
  source,
  /actual_s := greatest\([\s\S]*base_actual \* elo_result_weight \+ bonus_normalized \* elo_bonus_score_weight[\s\S]*\);/,
  "expected Supabase ELO replay to blend bonus score into the bounded actual result with lighter weight than wins",
);

assert.match(
  source,
  /select private\.refresh_all_elo_snapshots\(\);/,
  "expected the new migration to refresh the published ELO leaderboard after redefining the snapshot function",
);

console.log("elo-score-blend-supabase.test.cjs passed");
