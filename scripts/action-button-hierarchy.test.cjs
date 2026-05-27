const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "components", "ui", "ActionButton.tsx"),
  "utf8",
);

assert.match(
  source,
  /case "primary"[\s\S]*borderColor:/,
  "expected the primary ActionButton variant to define a dedicated border hierarchy marker",
);

assert.match(
  source,
  /case "secondary"[\s\S]*titleColor:/,
  "expected the secondary ActionButton variant to define a distinct title color hierarchy marker",
);

assert.match(
  source,
  /case "ghost"[\s\S]*subtitleColor:/,
  "expected the ghost ActionButton variant to define its own subdued subtitle tone",
);

assert.match(
  source,
  /case "danger"[\s\S]*pressedBackgroundColor:/,
  "expected the danger ActionButton variant to define a dedicated pressed state",
);

assert.match(
  source,
  /backgroundColor: pressed && !disabled[\s\S]*tone\.pressedBackgroundColor[\s\S]*tone\.backgroundColor/,
  "expected ActionButton to apply variant-driven fill styling without a separate overlay layer",
);

assert.match(
  source,
  /borderColor: tone\.borderColor/,
  "expected ActionButton to apply variant-driven border styling",
);

assert.match(
  source,
  /color: tone\.titleColor/,
  "expected ActionButton titles to inherit the variant hierarchy tone",
);

assert.match(
  source,
  /color: tone\.subtitleColor/,
  "expected ActionButton subtitles to inherit the variant hierarchy tone",
);

console.log("action-button-hierarchy.test.cjs passed");
