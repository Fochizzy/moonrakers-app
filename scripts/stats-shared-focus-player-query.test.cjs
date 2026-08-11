const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "stats.tsx"),
  "utf8",
);

// Only an explicit pick belongs in the key. selectedPlayerId is derived and
// back-fills from the payload, so keying on it fired a second get_stats_screen
// on every mount.
assert.match(
  source,
  /queryKey:\s*`stats-screen:\$\{profileId \|\| "anon"\}:\$\{explicitPlayerId \|\| "self"\}`/,
  "expected the stats screen live query key to include only an explicitly picked player id",
);

assert.match(
  source,
  /focusPlayerId:\s*explicitPlayerId/,
  "expected the stats screen to forward the explicitly picked player id into getStatsScreen",
);

assert.match(
  source,
  /const selectedPlayerId =\s*explicitPlayerId \?\?/,
  "expected the displayed player selection to derive from the explicit pick with a payload fallback",
);

assert.doesNotMatch(
  source,
  /setSelectedPlayerId\(\(current\) => current \?\? preferredPlayerId\)/,
  "expected the stats screen to stop writing the payload's own focus back into state, which re-keyed the query and refetched",
);

console.log("stats-shared-focus-player-query.test.cjs passed");
