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
  /function renderServerChart\(\)/,
  "expected the chart detail route to define a direct server-chart renderer before falling back to local shaping",
);

assert.match(
  chartRouteSource,
  /<LineChart[\s\S]*data=\{serverChartData as any\}[\s\S]*players=\{serverChartPlayers as any\}/,
  "expected the server-chart renderer to mount the native line chart from the RPC dataset instead of rebuilding snapshots locally",
);

assert.match(
  chartRouteSource,
  /case "replay_chart":[\s\S]*<ReplayChart[\s\S]*replay=\{serverReplayData as any\}[\s\S]*players=\{serverChartPlayers as any\}/,
  "expected the replay chart route to mount ReplayChart directly from server replay payloads",
);

assert.match(
  chartRouteSource,
  /const shouldUseLocalChartFallback =[\s\S]*localChartData\.hasData[\s\S]*!loading[\s\S]*!hasRenderableServerChart;/,
  "expected the chart detail route to prefer the synced-history fallback whenever the server only returns a non-renderable placeholder dataset",
);

assert.match(
  chartRouteSource,
  /const shouldLoadCloudFallback =[\s\S]*!loading[\s\S]*!hasRenderableServerChart[\s\S]*!shouldSkipCloudFallbackBecauseRpcSource;/,
  "expected the chart detail route to keep loading the shared Supabase snapshot when the server payload has summary metadata but no renderable chart data",
);

assert.match(
  chartRouteSource,
  /const shouldSkipCloudFallbackBecauseRpcSource =[\s\S]*hasRenderableServerChart\s*\|\|\s*\(hasUsableRpcFallbackHistory && localChartData\.hasData\);/,
  "expected chart detail cloud fallback loading to skip only when a real server chart or complete RPC-provided history is already enough to build the local fallback chart",
);

assert.match(
  chartRouteSource,
  /const serverChart = renderServerChart\(\);[\s\S]*if \(serverChart\) \{/,
  "expected renderDataset to prefer direct server chart rendering before loading or generic summary fallbacks",
);

console.log("chart-detail-server-render-contract.test.cjs passed");
