const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "player-profile", "index.tsx"),
  "utf8",
);

assert.match(
  source,
  /grid:\s*\{[\s\S]*flexDirection:\s*"column"[\s\S]*gap:\s*12[\s\S]*\}/,
  "expected the player directory list to stack full-width profile rows instead of the two-column tile grid",
);

assert.match(
  source,
  /card:\s*\{[\s\S]*width:\s*"100%"[\s\S]*flexDirection:\s*"row"[\s\S]*alignItems:\s*"center"[\s\S]*\}/,
  "expected the player directory card shell to become a horizontal row with the card art on the left",
);

assert.match(
  source,
  /nameBlock:\s*\{[\s\S]*alignItems:\s*"flex-start"[\s\S]*justifyContent:\s*"center"[\s\S]*\}/,
  "expected the player name block to align its content to the right side of the player card art",
);

assert.match(
  source,
  /cardName:\s*\{[\s\S]*textAlign:\s*"left"[\s\S]*\}/,
  "expected the player name to left-align within the right-hand content column",
);

assert.match(
  source,
  /cardPill:\s*\{[\s\S]*alignSelf:\s*"flex-start"[\s\S]*\}/,
  "expected the Open Profile pill to sit under the player name in the right-hand content column",
);

console.log("player-directory-card-layout.test.cjs passed");
