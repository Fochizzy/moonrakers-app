const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

const actionButtonSource = read(path.join("components", "ui", "ActionButton.tsx"));
const continueSectionSource = read(path.join("components", "ContinueSection.tsx"));
const legacyButtonSource = read(path.join("components", "ui", "Button.tsx"));

assert.ok(
  !actionButtonSource.includes("shadowOpacity"),
  "expected the shared ActionButton to remove the shadow-based layered button treatment",
);

assert.ok(
  !actionButtonSource.includes("shadowRadius"),
  "expected the shared ActionButton to avoid shadow blur so buttons read as a single fill",
);

assert.ok(
  !actionButtonSource.includes("elevation:"),
  "expected the shared ActionButton to avoid Android elevation that can create a darker inset look",
);

assert.match(
  actionButtonSource,
  /backgroundColor:\s*"transparent"/,
  "expected ActionButton labels to stay transparent so they do not introduce their own inner bar",
);

assert.ok(
  !continueSectionSource.includes("buttonOverlay"),
  "expected ContinueSection buttons to remove the explicit dark overlay layer",
);

assert.ok(
  !legacyButtonSource.includes("shadowOpacity"),
  "expected the legacy Button primitive to also remove its shadow-based layered treatment",
);

assert.match(
  legacyButtonSource,
  /backgroundColor:\s*'transparent'/,
  "expected the legacy Button label to stay transparent for the flatter single-color look",
);

console.log("button-single-color.test.cjs passed");
