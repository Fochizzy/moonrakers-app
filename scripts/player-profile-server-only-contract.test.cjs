const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "player-profile", "[playerId].tsx"),
  "utf8",
);

assert.match(
  source,
  /buildLocalPlayerProfileFallback/,
  "expected the player profile route to restore the shared local fallback helper when the published profile payload is still empty",
);

assert.match(
  source,
  /const recentGames = localProfileFallback\.recentGames;/,
  "expected the player profile route to merge local recent history through the shared fallback bundle",
);

assert.match(
  source,
  /const moonrakersIntel = localProfileFallback\.moonrakersIntel;/,
  "expected the player profile route to resolve Moonrakers intel through the shared fallback bundle",
);

assert.match(
  source,
  /const usingLocalMetricFallback = !hasData && Boolean\(fallbackSummary\?\.gamesPlayed\);/,
  "expected the player profile route to reserve metric fallback for the empty published-profile case only",
);

assert.match(
  source,
  /const profileSourceKind = usingLocalProfileFallback\s*\?\s*"device-fallback"\s*:\s*freshness\.sourceKind;/,
  "expected the player profile route to label the empty-profile recovery state honestly when local history fills the gaps",
);

console.log("player-profile-server-only-contract.test.cjs passed");
