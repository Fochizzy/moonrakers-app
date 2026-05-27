const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "game-setup.tsx"),
  "utf8",
);

assert.match(
  source,
  /function TurnOrderRow\(\{\s*item,\s*getIndex,\s*drag,\s*isActive,/s,
  "expected TurnOrderRow to read row position from getIndex so draggable rows keep a stable index",
);

assert.match(
  source,
  /const rowIndex = getIndex\(\) \?\? 0;/,
  "expected TurnOrderRow to normalize the draggable list index before rendering rank or accent color",
);

assert.match(
  source,
  /styles\.rowOrderPillText\}>\{rowIndex \+ 1\}</,
  "expected the turn-order pill to render from rowIndex instead of a possibly undefined index value",
);

assert.doesNotMatch(
  source,
  /tapSelectChip:\s*\{[^}]*borderWidth:\s*1,/,
  "expected the Tap to select chip to avoid a hard border line",
);

console.log("game-setup-turn-order-row.test.cjs passed");
