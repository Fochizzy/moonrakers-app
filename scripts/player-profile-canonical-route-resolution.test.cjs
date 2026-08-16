const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "player-profile", "[playerId].tsx"),
  "utf8",
);

// Canonicalization moved from canonicalizeSelectablePlayers to the shared
// analytics player directory, which returns the same alias map.
assert.match(
  source,
  /buildAnalyticsPlayerDirectory/,
  "expected the player profile detail route to import the canonical player resolver",
);

assert.match(
  source,
  /const analyticsPlayerDirectory = useMemo\(\s*\(\) =>\s*buildAnalyticsPlayerDirectory\(\{/s,
  "expected the player profile detail route to canonicalize the live store players before resolving the focus id",
);

assert.match(
  source,
  /const resolvedPlayerId = useMemo\(\s*\(\) =>[\s\S]*analyticsPlayerDirectory\.aliases\[normalizedRoutePlayerId\] \?\? normalizedRoutePlayerId/s,
  "expected the player profile detail route to remap stale local player ids to canonical registered ids",
);

assert.match(
  source,
  /focusPlayerId:\s*resolvedPlayerId \|\| null/,
  "expected the Supabase profile RPC to use the canonicalized focus player id",
);

assert.match(
  source,
  /if \(!playerId \|\| !resolvedPlayerId \|\| String\(playerId\) === String\(resolvedPlayerId\)\)/,
  "expected the player profile route to avoid unnecessary self-replacements once the route id is already canonical",
);

assert.match(
  source,
  /router\.replace\(buildPlayerProfileRoute\(String\(resolvedPlayerId\)\)\)/,
  "expected the player profile route to rewrite stale route ids to the canonical profile route",
);

assert.match(
  source,
  /\.\.\.canonicalStorePlayers/,
  "expected the player profile quick-pick pool to include canonical store players in addition to server payload options",
);

console.log("player-profile-canonical-route-resolution.test.cjs passed");
