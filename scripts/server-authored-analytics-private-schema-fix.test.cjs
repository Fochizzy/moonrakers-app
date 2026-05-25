const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");
const migrationPath = path.join(
  migrationsDir,
  "20260524123000_moonrakers_analytics_read_rpc_readonly_fix.sql",
);

assert.ok(
  fs.existsSync(migrationPath),
  "expected a follow-up migration that restores the public analytics read RPCs to read-only-safe rollup reads",
);

const source = fs.readFileSync(migrationPath, "utf8");

for (const snippet of [
  "public.get_analytics_home(uuid)",
  "public.get_stats_screen(uuid)",
  "public.get_insights_screen(uuid)",
  "public.get_chart_dataset(text,uuid,uuid,uuid,uuid[],uuid,text,text,text,uuid)",
  "select rollup.payload",
  "where rollup.profile_id = get_analytics_home.profile_id;",
  "where rollup.profile_id = get_stats_screen.profile_id;",
  "where rollup.profile_id = get_insights_screen.profile_id;",
  "where rollup.profile_id = get_chart_dataset.profile_id;",
  "from public.personal_stats_rollups as rollup",
  "pg_get_functiondef",
]) {
  assert.ok(
    source.includes(snippet),
    `expected ${path.basename(migrationPath)} to contain ${snippet}`,
  );
}

assert.ok(
  !source.includes("perform public.refresh_server_authored_analytics("),
  "expected the read-only repair migration to stop public analytics reads from invoking the write refresh RPC directly",
);

assert.ok(
  !source.includes("private.get_or_refresh_personal_stats_rollup("),
  "expected the read-only repair migration to avoid routing public analytics reads through the private self-heal helper",
);

console.log("server-authored-analytics-private-schema-fix.test.cjs passed");
