const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "game.tsx"),
  "utf8",
);

assert.match(
  source,
  /headToHeadButton:\s*\{[\s\S]*alignItems:\s*'center'/,
  "expected the Head to Head mission button container to center its content",
);

assert.match(
  source,
  /headToHeadButtonTitle:\s*\{[\s\S]*textAlign:\s*'center'/,
  "expected the Head to Head mission button label to keep centered text alignment",
);

console.log("head-to-head-mission-button-center.test.cjs passed");
