const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationSource = fs.readFileSync(
  path.join(
    projectRoot,
    "supabase",
    "migrations",
    "20260527173443_moonrakers_restore_chart_rpc_contracts.sql",
  ),
  "utf8",
);

assert.match(
  migrationSource,
  /rollup_payload->'statsScreen'->'games'->'items'/,
  "expected the restore chart RPC migration to source chart history from the published stats-screen game history",
);

assert.match(
  migrationSource,
  /'sourceGames'/,
  "expected the restore chart RPC migration to expose Supabase sourceGames in chart datasets",
);

assert.match(
  migrationSource,
  /'sourcePlayers'/,
  "expected the restore chart RPC migration to expose Supabase sourcePlayers in chart datasets",
);

assert.match(
  migrationSource,
  /rollup_payload->'insightsScreen'->'assistNetwork'/,
  "expected the relationship-graph branch to project the Supabase assist-network rollup when the published chart cache is thin",
);

console.log("chart-rpc-source-history-contract.test.cjs passed");
