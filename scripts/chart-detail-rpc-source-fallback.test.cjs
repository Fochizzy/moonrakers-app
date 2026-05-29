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
  /const hasUsableRpcFallbackHistory =\s*rpcFallbackGames\.length > 0 && rpcFallbackPlayers\.length > 0;[\s\S]*const fallbackPlayers =\s*hasUsableRpcFallbackHistory\s*\?\s*rpcFallbackPlayers\s*:\s*cloudFallbackPlayers\.length\s*\?\s*cloudFallbackPlayers\s*:\s*storePlayers;[\s\S]*const fallbackGames =\s*hasUsableRpcFallbackHistory\s*\?\s*rpcFallbackGames\s*:\s*cloudFallbackGames\.length\s*\?\s*cloudFallbackGames\s*:\s*storeGames;/,
  "expected the chart detail route to keep RPC-provided Supabase history ahead of cloud-snapshot and shared-store fallback sources only when the RPC history is complete",
);

assert.match(
  chartRouteSource,
  /const shouldSkipCloudFallbackBecauseRpcSource =[\s\S]*hasRenderableServerChart\s*\|\|\s*\(hasUsableRpcFallbackHistory && localChartData\.hasData\);/,
  "expected the chart detail route to skip the separate cloud snapshot only when complete RPC-provided source history is already enough to build a local fallback chart",
);

assert.match(
  chartRouteSource,
  /if \(cloudFallbackLoading && !hasRenderableServerChart && !localChartData\.hasData\) \{/,
  "expected the chart detail route to keep showing fallback-loading state while a non-renderable placeholder dataset waits on the shared Supabase snapshot",
);

console.log("chart-detail-rpc-source-fallback.test.cjs passed");
