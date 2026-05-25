const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const analyticsSource = fs.readFileSync(
  path.join(projectRoot, "app", "analytics.tsx"),
  "utf8",
);

assert.doesNotMatch(
  analyticsSource,
  /\{card\.eyebrow\}/,
  "expected analytics hub cards to hide eyebrow copy",
);

console.log("analytics-card-eyebrows.test.cjs passed");
