const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const screenSource = fs.readFileSync(
  path.join(projectRoot, "app", "analytics.tsx"),
  "utf8"
);

assert.doesNotMatch(
  screenSource,
  /<AnalyticsStateSection[\s\S]*sourceKind=/,
  "expected the analytics home directory to remove the header source badge pill"
);

assert.doesNotMatch(
  screenSource,
  /<AnalyticsStateSection[\s\S]*sourceLabel=/,
  "expected the analytics home directory to avoid passing a source label badge"
);

console.log("analytics-source-badge.test.cjs passed");
