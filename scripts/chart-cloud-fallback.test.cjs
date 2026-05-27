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
  /players:\s*rpcFallbackPlayers\.length\s*\?\s*rpcFallbackPlayers\s*:\s*cloudFallbackPlayers[\s\S]*games:\s*rpcFallbackGames\.length\s*\?\s*rpcFallbackGames\s*:\s*cloudFallbackGames/,
  "expected the chart detail route to prefer Supabase source history from the chart RPC before falling back to the shared cloud snapshot",
);

assert.match(
  chartRouteSource,
  /Supabase game history/i,
  "expected the chart detail route to explain when it is rendering cloud-backed fallback history",
);

assert.doesNotMatch(
  chartRouteSource,
  /saved history data|games saved on this device|Device fallback/i,
  "expected the chart detail route to stop advertising device-local analytics fallback copy",
);

console.log("chart-cloud-fallback.test.cjs passed");
