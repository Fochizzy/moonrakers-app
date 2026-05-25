const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const profileSource = fs.readFileSync(
  path.join(projectRoot, "app", "player-profile", "[playerId].tsx"),
  "utf8",
);

assert.match(
  profileSource,
  /lib\/cloud\/analytics\/getPlayerProfileScreen/,
  "expected the player-profile route to import the server-authored player-profile wrapper",
);

assert.doesNotMatch(
  profileSource,
  /useMetricScreenData|computeMetric|buildAllRowsForPlayer|buildProfileInsights|buildCustomTabCards|buildPlaystyleSamples|buildMoonrakersIntelProfile/,
  "expected the player-profile route to stop deriving analytics locally once the server-authored profile contract exists",
);

console.log("player-profile-screen-no-local-derivation.test.cjs passed");
