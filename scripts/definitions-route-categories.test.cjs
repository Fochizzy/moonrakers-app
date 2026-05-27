const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const routesSource = read(path.join("utils", "appRoutes.ts"));
const definitionsSource = read(path.join("app", "definitions.tsx"));
const catalogSource = read(path.join("utils", "definitionCatalog.ts"));

assert.match(
  routesSource,
  /export function buildDefinitionsRoute\([\s\S]*metric\?: string \| null[\s\S]*category\?: string \| null/s,
  "expected appRoutes to support both metric and category inputs for Definitions deep links",
);

assert.match(
  routesSource,
  /pathname: APP_ROUTES\.definitions/,
  "expected the Definitions route helper to still target the Definitions screen",
);

assert.match(
  routesSource,
  /params:\s*\{[\s\S]*metric[\s\S]*category[\s\S]*\}/s,
  "expected the Definitions route helper to forward metric and category params",
);

assert.match(
  definitionsSource,
  /useLocalSearchParams<\{[\s\S]*metric\?: string(?: \| string\[\])?;[\s\S]*category\?: string(?: \| string\[\])?;[\s\S]*\}>/s,
  "expected the Definitions screen to read both metric and category params, even with extra route context",
);

assert.match(
  definitionsSource,
  /const targetCategory = String\(/,
  "expected the Definitions screen to normalize a route-provided category target",
);

assert.match(
  definitionsSource,
  /if \(targetMetric\)[\s\S]*setActiveCategory\(matchingGroup\.key\)/s,
  "expected metric targeting to continue selecting the matching Definitions category",
);

assert.match(
  definitionsSource,
  /if \(!targetMetric && targetCategory\)[\s\S]*setActiveCategory\(targetCategory\)/s,
  "expected category-only targeting to preselect the requested Definitions category",
);

assert.match(
  catalogSource,
  /key: "elo"/,
  "expected the shared Definitions catalog to expose an ELO category",
);

assert.match(
  catalogSource,
  /key: "correlations"/,
  "expected the shared Definitions catalog to expose a correlations category",
);

console.log("definitions-route-categories.test.cjs passed");
