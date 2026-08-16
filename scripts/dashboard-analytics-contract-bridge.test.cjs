const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const packageJson = JSON.parse(
  read(path.join("packages", "analytics-contract", "package.json")),
);

assert.equal(
  packageJson.name,
  "@moonrakers/analytics-contract",
  "expected the analytics workspace package name to be @moonrakers/analytics-contract",
);

assert.match(
  read(path.join("lib", "cloud", "analytics", "types.ts")),
  /export \* from "@moonrakers\/analytics-contract";/,
  "expected Expo analytics types to surface the shared analytics package types",
);

for (const relPath of [
  path.join("lib", "cloud", "analytics", "getAnalyticsHome.ts"),
  path.join("lib", "cloud", "analytics", "getStatsScreen.ts"),
  path.join("lib", "cloud", "analytics", "getInsightsScreen.ts"),
  path.join("lib", "cloud", "analytics", "getChartSetup.ts"),
  path.join("lib", "cloud", "analytics", "getChartDataset.ts"),
  path.join("lib", "cloud", "analytics", "getEloScreen.ts"),
  path.join("lib", "cloud", "analytics", "getPlayerProfileScreen.ts"),
]) {
  assert.match(
    read(relPath),
    /from "@moonrakers\/analytics-contract"/,
    `expected ${relPath} to delegate to the shared analytics package`,
  );
}

console.log("dashboard-analytics-contract-bridge.test.cjs passed");
