const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "compare", "index.tsx"),
  "utf8"
);

assert.match(
  source,
  /<HeroCard[\s\S]*title="Compare"/,
  "expected the compare hero title to stay on the generic Compare label"
);

assert.doesNotMatch(
  source,
  /<ActionButton[\s\S]*title="Stats"[\s\S]*router\.push\("\/stats"\)/,
  "expected the compare hero to stop rendering the old Stats shortcut"
);

console.log("chart-compare-hero-copy.test.cjs passed");
