const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260523120000_moonrakers_server_authored_analytics_contracts.sql",
);

assert.ok(
  fs.existsSync(migrationPath),
  "expected the server-authored analytics migration to exist at supabase/migrations/20260523120000_moonrakers_server_authored_analytics_contracts.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");

for (const pattern of [
  /create table if not exists public\.personal_stats_rollups/i,
  /create or replace function public\.get_analytics_home/i,
  /create or replace function public\.get_stats_screen/i,
  /create or replace function public\.get_insights_screen/i,
  /create or replace function public\.get_chart_setup/i,
  /create or replace function public\.get_chart_dataset/i,
  /create or replace function public\.refresh_server_authored_analytics/i,
]) {
  assert.match(
    source,
    pattern,
    `expected ${path.basename(migrationPath)} to contain ${pattern}`,
  );
}

console.log("server-authored-analytics-migration.test.cjs passed");
