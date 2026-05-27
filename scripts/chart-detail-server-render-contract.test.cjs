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
  /const hasServerPayload = hasData \|\| hasRenderableServerChart;/,
  "expected the route to treat direct chart-family payloads as first-class server data even when generic points and series are empty",
);

assert.match(
  chartRouteSource,
  /const serverChart = renderServerChart\(\);[\s\S]*if \(serverChart\) \{/,
  "expected renderDataset to prefer direct server chart rendering before loading or generic summary fallbacks",
);

console.log("chart-detail-server-render-contract.test.cjs passed");
