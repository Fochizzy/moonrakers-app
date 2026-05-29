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
  /lib\/cloud\/loadCloudSnapshot/,
  "expected the chart detail route to import loadCloudSnapshot for cloud-backed fallback data",
);

assert.match(
  chartRouteSource,
  /cloudFallbackSnapshot/,
  "expected the chart detail route to keep cloud fallback snapshot state",
);

assert.match(
  chartRouteSource,
  /loadCloudSnapshot\(profileId\)/,
  "expected the chart detail route to hydrate fallback chart data from Supabase when needed",
);

assert.match(
  chartRouteSource,
  /const hasUsableRpcFallbackHistory =\s*rpcFallbackGames\.length > 0 && rpcFallbackPlayers\.length > 0;[\s\S]*const fallbackPlayers =\s*hasUsableRpcFallbackHistory\s*\?\s*rpcFallbackPlayers\s*:\s*cloudFallbackPlayers\.length\s*\?\s*cloudFallbackPlayers\s*:\s*storePlayers;[\s\S]*const fallbackGames =\s*hasUsableRpcFallbackHistory\s*\?\s*rpcFallbackGames\s*:\s*cloudFallbackGames\.length\s*\?\s*cloudFallbackGames\s*:\s*storeGames;/,
  "expected the chart detail route to require complete RPC history before preferring it ahead of the shared cloud snapshot and hydrated device store",
);

assert.match(
  chartRouteSource,
  /if \(shouldUseLocalChartFallback\) \{[\s\S]*const localChart = renderLocalChartFallback\(\);[\s\S]*<ChartSurface>[\s\S]*\{localChart\}/,
  "expected the chart detail route to keep a dedicated local fallback rendering branch even after the extra recovery chrome is removed",
);

console.log("chart-cloud-fallback.test.cjs passed");
