const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "game-setup.tsx"),
  "utf8"
);

assert.equal(
  source.includes("<TurnOrderSummary"),
  false,
  "game setup should not render a separate top summary box"
);

assert.equal(
  source.includes("<CaptainNameStrip"),
  false,
  "game setup should not render a separate name strip above the card list"
);

assert.equal(
  source.includes("<DraggableFlatList"),
  true,
  "game setup should still render a draggable card list"
);

console.log("game-setup-single-surface.test.cjs passed");
