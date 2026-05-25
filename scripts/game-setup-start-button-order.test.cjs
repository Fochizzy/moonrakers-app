const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const gameSetupSource = fs.readFileSync(
  path.join(projectRoot, "app", "game-setup.tsx"),
  "utf8"
);
const actionButtonSource = fs.readFileSync(
  path.join(projectRoot, "components", "ui", "ActionButton.tsx"),
  "utf8"
);

assert.match(
  gameSetupSource,
  /<ActionButton[\s\S]*title="Start Game"[\s\S]*subtitle=\{buildTurnOrderSummary\(turnOrder\)\}/,
  "expected the game setup Start Game CTA to show the live turn-order summary"
);

assert.match(
  actionButtonSource,
  /type ActionButtonProps = \{[\s\S]*subtitle\?: string;[\s\S]*\};/,
  "expected ActionButton to support an optional subtitle prop"
);

assert.match(
  actionButtonSource,
  /subtitle \? <Text style=\{styles\.subtitle\}>\{subtitle\}<\/Text> : null/,
  "expected ActionButton to render the subtitle when provided"
);

console.log("game-setup-start-button-order.test.cjs passed");
