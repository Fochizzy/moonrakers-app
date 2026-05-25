const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260523203000_moonrakers_server_authored_analytics_rollup_alias_fix.sql",
);

assert.ok(
  fs.existsSync(migrationPath),
  "expected a follow-up migration that reapplies the analytics functions with the rollup alias fix",
);

const source = fs.readFileSync(migrationPath, "utf8");

for (const snippet of [
  "public.get_analytics_home(uuid)",
  "public.get_stats_screen(uuid)",
  "public.get_insights_screen(uuid)",
  "public.get_chart_dataset(text,uuid,uuid,uuid,uuid[],uuid,text,text,text,uuid)",
  "select public.personal_stats_rollups.payload",
  "select rollup.payload",
  "pg_get_functiondef",
]) {
  assert.ok(
    source.includes(snippet),
    `expected ${path.basename(migrationPath)} to contain ${snippet}`,
  );
}

console.log("server-authored-analytics-rollup-alias-patch.test.cjs passed");
