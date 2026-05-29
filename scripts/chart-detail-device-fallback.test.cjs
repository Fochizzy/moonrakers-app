const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const chartDetailSource = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "[chartKey].tsx"),
  "utf8",
);

assert.match(
  chartDetailSource,
  /import\s*\{\s*useGames,\s*usePlayers,\s*useStore\s*\}\s*from\s*"@\/store\/useStore";/,
  "expected chart detail to subscribe to the shared players and games store for last-resort device fallback data",
);

assert.match(
  chartDetailSource,
  /const hasUsableRpcFallbackHistory =\s*rpcFallbackGames\.length > 0 && rpcFallbackPlayers\.length > 0;/,
  "expected chart detail to require both RPC games and RPC players before trusting the RPC history fallback",
);

assert.match(
  chartDetailSource,
  /const fallbackPlayers =\s*hasUsableRpcFallbackHistory\s*\?\s*rpcFallbackPlayers\s*:\s*cloudFallbackPlayers\.length\s*\?\s*cloudFallbackPlayers\s*:\s*storePlayers;/,
  "expected chart detail to use RPC players only when the RPC history fallback is complete, then fall back to cloud snapshot players and the shared in-app player store",
);

assert.match(
  chartDetailSource,
  /const fallbackGames =\s*hasUsableRpcFallbackHistory\s*\?\s*rpcFallbackGames\s*:\s*cloudFallbackGames\.length\s*\?\s*cloudFallbackGames\s*:\s*storeGames;/,
  "expected chart detail to use RPC games only when the RPC history fallback is complete, then fall back to cloud snapshot games and the shared in-app game store",
);

assert.match(
  chartDetailSource,
  /players:\s*fallbackPlayers[\s\S]*games:\s*fallbackGames/,
  "expected local chart fallback state to build from the shared fallback source chain",
);

assert.match(
  chartDetailSource,
  /authProfileId:\s*profileId\s*\|\|\s*null[\s\S]*authSessionUserId:\s*profileId\s*\|\|\s*null/,
  "expected chart detail to pass the signed-in profile through to the local fallback builder so player selection prefers real tracked history",
);

assert.match(
  chartDetailSource,
  /const shouldLoadCloudFallback =[\s\S]*!localChartData\.hasData[\s\S]*!hasRenderableServerChart/,
  "expected chart detail to skip a separate cloud snapshot request when the shared fallback history already has chart data",
);

console.log("chart-detail-device-fallback.test.cjs passed");
