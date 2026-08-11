const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "game-setup.tsx"),
  "utf8",
);

assert.match(
  source,
  /<PlayerCardIcon[\s\S]*size=\{64\}[\s\S]*borderRadius=\{12\}/,
  "expected setup tiles to shrink the player card art for a denser four-up vertical layout",
);

assert.match(
  source,
  /rowCard:\s*\{[\s\S]*minHeight:\s*116,[\s\S]*paddingHorizontal:\s*12,[\s\S]*paddingVertical:\s*10,/,
  "expected setup tiles to use a more compact card shell so four players fit vertically",
);

assert.match(
  source,
  /rowAvatarWrap:\s*\{[\s\S]*width:\s*76,[\s\S]*height:\s*96,[\s\S]*borderRadius:\s*16,/,
  "expected setup tiles to reduce the card-art frame dimensions",
);

assert.match(
  source,
  /rowName:\s*\{[\s\S]*fontSize:\s*15,/,
  "expected setup tiles to shrink the player name typography",
);

console.log("game-setup-compact-tile-fit.test.cjs passed");
