const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "CorrelationStats.tsx"),
  "utf8",
);

assert.match(
  source,
  /serverData\?\.winLoseSplit/,
  "expected CorrelationStats to read legacy winLoseSplit rows when personal insight arrays are empty",
);

assert.match(
  source,
  /serverData\?\.items/,
  "expected CorrelationStats to keep a fallback path for legacy insight correlation rows",
);

assert.match(
  source,
  /const serverLegacyCorrelationItems = useMemo\(\(\) => \{/,
  "expected CorrelationStats to normalize legacy server correlation rows separately from the newer personal and pairing arrays",
);

assert.match(
  source,
  /Number\.isFinite\(numericValue\)\s*\?\s*numericValue\s*:\s*Number\.isFinite\(fallbackDelta\)\s*\?\s*fallbackDelta\s*:\s*0/s,
  "expected legacy server correlation rows to fall back from value to delta when the older payload shape is returned",
);

assert.match(
  source,
  /if \(serverPersonalCorrelations.length > 0 \|\| serverPairingCorrelations.length > 0\) \{[\s\S]*if \(\s*serverOnly\s*\|\|\s*serverLegacyCorrelationItems.length > 0\s*\)/,
  "expected server-only personal correlations to use legacy server rows only when the newer personal and pairing arrays are empty",
);

console.log("correlation-stats-server-personal-fallback.test.cjs passed");
