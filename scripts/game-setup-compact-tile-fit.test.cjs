const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "game-setup.tsx"),
  "utf8",
);

assert.match(
  source,
  /<PlayerCardIcon[\s\S]*size=\{48\}[\s\S]*borderRadius=\{10\}/,
  "expected setup tiles to shrink the player card art for a denser vertical layout",
);

assert.match(
  source,
  /rowCard:\s*\{[\s\S]*minHeight:\s*92,[\s\S]*paddingHorizontal:\s*10,[\s\S]*paddingVertical:\s*8,/,
  "expected setup tiles to use a more compact card shell so more players fit vertically",
);

assert.match(
  source,
  /rowAvatarWrap:\s*\{[\s\S]*width:\s*58,[\s\S]*height:\s*74,[\s\S]*borderRadius:\s*13,/,
  "expected setup tiles to reduce the card-art frame dimensions",
);

assert.match(
  source,
  /rowName:\s*\{[\s\S]*fontSize:\s*14,/,
  "expected setup tiles to shrink the player name typography",
);

console.log("game-setup-compact-tile-fit.test.cjs passed");
