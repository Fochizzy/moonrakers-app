const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const screenSource = fs.readFileSync(
  path.join(projectRoot, "app", "insights.tsx"),
  "utf8"
);

assert.match(
  screenSource,
  /<AnalyticsStateSection[\s\S]*sourceCaption=/,
  "expected the insights screen to keep a source caption in the shared state section"
);

assert.doesNotMatch(
  screenSource,
  /<AnalyticsStateSection[\s\S]*sourceKind=/,
  "expected the insights screen to remove the header source badge pill"
);

assert.doesNotMatch(
  screenSource,
  /<AnalyticsStateSection[\s\S]*sourceLabel=/,
  "expected the insights screen to avoid passing a source label badge"
);

console.log("insights-source-badge.test.cjs passed");
