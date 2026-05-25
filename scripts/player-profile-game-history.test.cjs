const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "player-profile", "[playerId].tsx"),
  "utf8",
);

assert.doesNotMatch(
  source,
  /slice\(-6\)/,
  "expected the player profile game history list to stop truncating at six entries",
);

assert.match(
  source,
  /return filteredGames\.reverse\(\);/,
  "expected the player profile game history list to show the full filtered history in newest-first order",
);

assert.match(
  source,
  /\{selectedOpponentId \? "Filtered by opponent" : "Full history"\}/,
  "expected the player profile history section copy to reflect the full-history list",
);

console.log("player-profile-game-history.test.cjs passed");
