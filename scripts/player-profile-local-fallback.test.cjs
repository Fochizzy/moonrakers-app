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

assert.doesNotMatch(
  profileSource,
  /buildLocalPlayerProfileFallback/,
  "expected the player profile route to stop rebuilding recent games and Moonrakers intel locally once the published Supabase profile contract ships them directly",
);

assert.match(
  profileSource,
  /const recentGames = toArray\(payload\?\.recentGames\);/,
  "expected the player profile route to read recent games directly from the published profile payload",
);

assert.match(
  profileSource,
  /const moonrakersIntel = payload\?\.moonrakersIntel;/,
  "expected the player profile route to pass through the published Moonrakers intel payload directly",
);

assert.match(
  historySource,
  /displayedGames\.length - index/,
  "expected the history screen to continue rendering archive game numbers from the visible history list",
);

console.log("player-profile-local-fallback.test.cjs passed");
