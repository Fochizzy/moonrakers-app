const assert = require("node:assert/strict");
const { readGameScreenSource } = require("./support/game-screen-source.cjs");

const source = readGameScreenSource();

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
