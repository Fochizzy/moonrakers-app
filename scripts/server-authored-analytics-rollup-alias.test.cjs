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

const source = fs.readFileSync(migrationPath, "utf8");

const aliasedRollupTableReferences = [
  ...source.matchAll(
    /select\s+public\.personal_stats_rollups\.payload\s+into\s+rollup_payload\s+from\s+public\.personal_stats_rollups\s+as\s+rollup/gi,
  ),
];

assert.equal(
  aliasedRollupTableReferences.length,
  0,
  "expected personal_stats_rollups reads to use the rollup alias after aliasing the table",
);

console.log("server-authored-analytics-rollup-alias.test.cjs passed");
