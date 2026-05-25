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
  /players:\s*localFallbackPlayers[\s\S]*games:\s*localFallbackGames/,
  "expected the chart detail route to build fallback chart state from either store data or cloud snapshot data",
);

assert.match(
  chartRouteSource,
  /Supabase game history/i,
  "expected the chart detail route to explain when it is rendering cloud-backed fallback history",
);

console.log("chart-cloud-fallback.test.cjs passed");
