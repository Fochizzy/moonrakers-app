const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const routesSource = read(path.join("utils", "appRoutes.ts"));
const definitionsSource = read(path.join("app", "definitions.tsx"));

assert.match(
  routesSource,
  /export function buildDefinitionsRoute\(metric: string\)/,
  "expected appRoutes to expose a dedicated definitions deep-link helper",
);

assert.match(
  routesSource,
  /pathname: APP_ROUTES\.definitions/,
  "expected the definitions route helper to target the definitions screen",
);

assert.match(
  routesSource,
  /params: \{ metric \}/,
  "expected the definitions route helper to forward the metric key",
);

assert.match(
  definitionsSource,
  /const targetMetric = String\(params\?\.metric \?\? ""\)\.trim\(\)/,
  "expected the definitions screen to continue honoring route-provided metric keys",
);

console.log("assist-context-route-links.test.cjs passed");
