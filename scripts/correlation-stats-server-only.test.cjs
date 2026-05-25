const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const insightsSource = read(path.join("app", "insights.tsx"));
const correlationSource = read(path.join("components", "CorrelationStats.tsx"));

assert.match(
  insightsSource,
  /<CorrelationStats[\s\S]*serverOnly/,
  "expected analytics insights routes to opt CorrelationStats into server-only mode",
);

assert.match(
  correlationSource,
  /serverOnly\?: boolean;/,
  "expected CorrelationStats to accept a serverOnly guard for analytics routes",
);

assert.match(
  correlationSource,
  /const serverPersonalCorrelations = useMemo\(\(\) => \{/,
  "expected CorrelationStats to normalize server-authored personal correlation rows",
);

assert.match(
  correlationSource,
  /serverData\?\.personal/,
  "expected CorrelationStats to read the personal correlations payload from the server contract",
);

assert.match(
  correlationSource,
  /serverOnly\s*\|\|\s*serverPersonalCorrelations\.length > 0\s*\|\|\s*serverPairingCorrelations\.length > 0/,
  "expected personal correlations to avoid local fallback when serverOnly is enabled",
);

assert.match(
  correlationSource,
  /if \(serverOnly \|\| serverMacroCorrelations.length > 0\)/,
  "expected macro correlations to avoid local fallback when serverOnly is enabled",
);

assert.match(
  correlationSource,
  /if \(serverOnly \|\| serverSynergyPairs.length > 0\)/,
  "expected synergy correlations to avoid local fallback when serverOnly is enabled",
);

console.log("correlation-stats-server-only.test.cjs passed");
