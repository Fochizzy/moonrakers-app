const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260524123000_moonrakers_analytics_read_rpc_readonly_fix.sql",
);

assert.equal(
  fs.existsSync(migrationPath),
  true,
  "expected the readonly-fix migration to exist",
);

const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /if patched_function_sql = function_sql then/i,
  "expected the migration to handle unchanged function definitions explicitly",
);

assert.match(
  source,
  /'already_safe_pattern'/i,
  "expected the migration to declare a dedicated already-safe match for functions that no longer need rewriting",
);

assert.match(
  source,
  /if function_sql ~[\s\S]*target->>'already_safe_pattern'[\s\S]*then[\s\S]*continue;/i,
  "expected the migration to skip functions that are already in the read-only-safe target state",
);

assert.match(
  source,
  /raise exception 'Could not restore read-only-safe analytics RPC for %\.'/i,
  "expected the migration to keep failing on unknown function bodies",
);

console.log("analytics-read-rpc-readonly-fix-migration.test.cjs passed");
