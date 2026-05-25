const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260524205502_moonrakers_stats_screen_rollup_sections.sql",
);

assert.equal(
  fs.existsSync(migrationPath),
  true,
  "expected the stats-screen rollup migration to exist",
);

const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /create or replace function public\.get_stats_screen/i,
  "expected the migration to patch the stats-screen read contract",
);

assert.match(
  source,
  /'playstyle',\s*jsonb_build_object\([\s\S]*'highlights',\s*jsonb_build_array\(/i,
  "expected the stats-screen playstyle section to emit server-authored highlight rows",
);

assert.match(
  source,
  /jsonb_set\([\s\S]*'\{playstyle\}'[\s\S]*'highlights',\s*jsonb_build_array\(/i,
  "expected the playstyle section to override the empty fallback with real highlight rows",
);

assert.match(
  source,
  /'correlations',\s*jsonb_build_object\([\s\S]*'items',\s*jsonb_build_array\(/i,
  "expected the stats-screen correlations section to emit server-authored correlation items",
);

assert.match(
  source,
  /corr\s*\(/i,
  "expected the correlations section to calculate real correlation values instead of static copy",
);

assert.match(
  source,
  /'games',\s*jsonb_build_object\([\s\S]*'items',\s*jsonb_build_array\(/i,
  "expected the stats-screen games section to emit server-authored game summary items",
);

console.log("stats-screen-rollup-sections.test.cjs passed");
