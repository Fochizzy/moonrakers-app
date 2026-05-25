const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");
const migrationNames = fs.readdirSync(migrationsDir);
const fixMigrationName = migrationNames.find((name) =>
  name.includes("moonrakers_fix_insights_rollup_alias") ||
    name.includes("moonrakers_server_authored_analytics_rollup_alias_fix"),
);

assert.ok(
  fixMigrationName,
  "expected a follow-up migration that corrects the personal_stats_rollups alias bug",
);

const source = fs.readFileSync(path.join(migrationsDir, fixMigrationName), "utf8");
const hasDirectInsightsRewrite =
  /create or replace function public\.get_insights_screen/i.test(source);
const hasBroadAnalyticsRepair =
  /pg_get_functiondef\('public\.get_insights_screen\(uuid\)'::regprocedure\)/i.test(
    source,
  );

assert.ok(
  hasDirectInsightsRewrite || hasBroadAnalyticsRepair,
  "expected the corrective migration to target get_insights_screen directly or through the broader analytics repair block",
);
assert.ok(
  /select\s+rollup\.payload\s+into\s+rollup_payload\s+from\s+public\.personal_stats_rollups\s+as\s+rollup/gi.test(
    source,
  ) ||
    /replace\(function_sql,\s*bad_reference,\s*'select rollup\.payload'\)/i.test(
      source,
    ),
  "expected the corrective migration to rewrite aliased personal_stats_rollups reads to use rollup.payload",
);
assert.doesNotMatch(
  source,
  /select\s+public\.personal_stats_rollups\.payload\s+into\s+rollup_payload\s+from\s+public\.personal_stats_rollups\s+as\s+rollup/gi,
  "expected the corrective migration to avoid the broken aliased-table reference",
);

console.log("insights-rollup-fix-migration.test.cjs passed");
