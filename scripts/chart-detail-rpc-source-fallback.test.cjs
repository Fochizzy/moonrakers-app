const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const chartRouteSource = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "[chartKey].tsx"),
  "utf8",
);

assert.match(
  chartRouteSource,
  /datasetData\.sourcePlayers|toArray\(datasetData\.sourcePlayers\)/,
  "expected the chart detail route to read Supabase sourcePlayers from the published chart dataset",
);

assert.match(
  chartRouteSource,
  /datasetData\.sourceGames|toArray\(datasetData\.sourceGames\)/,
  "expected the chart detail route to read Supabase sourceGames from the published chart dataset",
);

assert.match(
  chartRouteSource,
  /players:\s*rpcFallbackPlayers\.length\s*\?\s*rpcFallbackPlayers\s*:\s*cloudFallbackPlayers[\s\S]*games:\s*rpcFallbackGames\.length\s*\?\s*rpcFallbackGames\s*:\s*cloudFallbackGames/,
  "expected the chart detail route to prefer RPC-provided Supabase history before loading a separate cloud snapshot",
);

assert.match(
  chartRouteSource,
  /shouldSkipCloudFallbackBecauseRpcSource/,
  "expected the chart detail route to track when Supabase source history from the chart RPC is enough to skip a separate cloud snapshot",
);

console.log("chart-detail-rpc-source-fallback.test.cjs passed");
