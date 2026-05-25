const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "game.tsx"),
  "utf8",
);

assert.match(
  source,
  /playersInTurnOrder:\s*Player\[];/,
  "expected ObjectivesSection to accept the full player list in turn order",
);

assert.match(
  source,
  /playersInTurnOrder\.map\(\(player,\s*index\)\s*=>\s*\(/,
  "expected ObjectivesSection to render objective rows from the turn-order player list",
);

assert.doesNotMatch(
  source,
  /<ObjectiveRow[\s\S]*title=\{currentPlayerName\}[\s\S]*\{otherPlayers\.map\(/,
  "expected ObjectivesSection to stop rendering the current player separately ahead of the turn-order rows",
);

assert.match(
  source,
  /<ObjectivesSection[\s\S]*playersInTurnOrder=\{players\}/,
  "expected the live game screen to pass the active turn-order player list into ObjectivesSection",
);

console.log("game-objectives-turn-order.test.cjs passed");
