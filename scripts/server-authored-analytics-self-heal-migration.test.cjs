const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");
const migrationNames = fs.readdirSync(migrationsDir);
const fixMigrationName = migrationNames.find((name) =>
  name.includes("moonrakers_server_authored_analytics_rollup_self_heal"),
);

assert.ok(
  fixMigrationName,
  "expected a follow-up migration that self-heals missing personal analytics rollups inside the analytics read RPCs",
);

const source = fs.readFileSync(path.join(migrationsDir, fixMigrationName), "utf8");

for (const snippet of [
  "create or replace function private.get_or_refresh_personal_stats_rollup",
  "private.refresh_server_authored_analytics(target_profile_id)",
  "public.get_analytics_home(uuid)",
  "public.get_stats_screen(uuid)",
  "public.get_insights_screen(uuid)",
  "public.get_chart_dataset(text,uuid,uuid,uuid,uuid[],uuid,text,text,text,uuid)",
  "private.get_or_refresh_personal_stats_rollup(get_analytics_home.profile_id)",
  "private.get_or_refresh_personal_stats_rollup(get_stats_screen.profile_id)",
  "private.get_or_refresh_personal_stats_rollup(get_insights_screen.profile_id)",
  "private.get_or_refresh_personal_stats_rollup(get_chart_dataset.profile_id)",
]) {
  assert.ok(
    source.includes(snippet),
    `expected ${path.basename(fixMigrationName)} to contain ${snippet}`,
  );
}

console.log("server-authored-analytics-self-heal-migration.test.cjs passed");
