const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "index.tsx"),
  "utf8"
);

assert.match(
  source,
  /lib\/cloud\/analytics\/getChartSetup/,
  "expected the chart setup screen to import the Supabase chart-setup wrapper",
);

assert.doesNotMatch(
  source,
  /getSupportedMetricKeysForChart|normalizeMetricForChart/,
  "expected the chart setup screen to stop deriving valid metrics from local chart helpers",
);

assert.doesNotMatch(
  source,
  /state\?\.\s*players|Array\.isArray\(state\?\.players\)/,
  "expected the chart setup screen to stop sourcing player setup options from local store players",
);

assert.doesNotMatch(
  source,
  /getMetricOrFallback/,
  "expected the chart setup screen to stop resolving chart setup metric labels from the local metric map",
);

console.log("chart-setup-supabase-source.test.cjs passed");
