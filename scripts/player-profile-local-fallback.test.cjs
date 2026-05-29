const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const profileSource = fs.readFileSync(
  path.join(projectRoot, "app", "player-profile", "[playerId].tsx"),
  "utf8",
);
const historySource = fs.readFileSync(
  path.join(projectRoot, "app", "history.tsx"),
  "utf8",
);

assert.match(
  profileSource,
  /buildAnalyticsPlayerDirectory/,
  "expected the player profile route to canonicalize the local analytics player directory before rebuilding empty published profiles from device history",
);

assert.match(
  profileSource,
  /buildLocalPlayerProfileFallback/,
  "expected the player profile route to restore the shared local profile fallback helper when the published payload stays empty",
);

assert.match(
  profileSource,
  /const recentGames = localProfileFallback\.recentGames;/,
  "expected the player profile route to merge local recent games through the shared fallback helper",
);

assert.match(
  profileSource,
  /const moonrakersIntel = localProfileFallback\.moonrakersIntel;/,
  "expected the player profile route to merge local Moonrakers intel through the shared fallback helper",
);

assert.match(
  historySource,
  /displayedGames\.length - index/,
  "expected the history screen to continue rendering archive game numbers from the visible history list",
);

console.log("player-profile-local-fallback.test.cjs passed");
