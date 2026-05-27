const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const assetSource = read(path.join("utils", "playerCardAssets.ts"));
const profileSource = read(path.join("app", "player-profile", "[playerId].tsx"));
const colorPlayerCardSource = read(path.join("components", "ColorPlayerCard.tsx"));

assert.match(
  assetSource,
  /export function getPlayerCardSourceByArtIndex\(/,
  "expected player card assets to expose a shared art-index source resolver",
);

assert.doesNotMatch(
  profileSource,
  /player-card-sheet\.png/,
  "expected player profile badges to stop using the sheet crop renderer for assigned player cards",
);

assert.match(
  profileSource,
  /getPlayerCardSourceByArtIndex/,
  "expected player profile to render assigned card art through the shared source resolver",
);

assert.doesNotMatch(
  colorPlayerCardSource,
  /player-card-sheet\.png/,
  "expected ColorPlayerCard to stop using the sheet crop renderer for assigned player cards",
);

assert.match(
  colorPlayerCardSource,
  /getPlayerCardSourceByArtIndex/,
  "expected ColorPlayerCard to render assigned card art through the shared source resolver",
);

console.log("player-card-source-consistency.test.cjs passed");
