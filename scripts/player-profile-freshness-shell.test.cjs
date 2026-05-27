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
  /AnalyticsRecoveryCard/,
  "expected the player profile screen to use the shared analytics recovery shell for degraded freshness states",
);

assert.match(
  source,
  /freshness\.retryAction/,
  "expected the player profile recovery shell to surface the shared retry action",
);

assert.doesNotMatch(
  source,
  /Latest refresh failed/,
  "expected the player profile header to stop hand-rolling the degraded freshness copy inline",
);

console.log("player-profile-freshness-shell.test.cjs passed");
