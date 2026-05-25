const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const recoveryCardSource = read(
  path.join("components", "analytics", "AnalyticsRecoveryCard.tsx"),
);
const chartRouteSource = read(path.join("app", "charts", "[chartKey].tsx"));

assert.match(
  recoveryCardSource,
  /DefinitionsJumpLink/,
  "expected AnalyticsRecoveryCard to support glossary links for recovery and fallback states",
);

assert.match(
  recoveryCardSource,
  /sourceKind\??:/,
  "expected AnalyticsRecoveryCard to accept a sourceKind or provenance input",
);

assert.match(
  chartRouteSource,
  /AnalyticsRecoveryCard/,
  "expected chart detail route to use AnalyticsRecoveryCard for fallback messaging",
);

assert.match(
  chartRouteSource,
  /Server data|Supabase fallback|Device fallback/,
  "expected chart detail route to render explicit provenance labels for published and fallback data",
);

console.log("analytics-provenance-fallback.test.cjs passed");
