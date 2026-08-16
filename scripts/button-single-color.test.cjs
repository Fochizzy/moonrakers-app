const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const actionButtonSource = read(path.join("components", "ui", "ActionButton.tsx"));

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

// The flat single-colour treatment used to be duplicated across a legacy Button
// primitive and ContinueSection. Both were unreachable and have been removed, so
// ActionButton is the only place the rule can drift.
for (const removed of [
  path.join("components", "ui", "Button.tsx"),
  path.join("components", "ContinueSection.tsx"),
]) {
  assert.equal(
    fs.existsSync(path.join(projectRoot, removed)),
    false,
    `expected the superseded ${removed} button surface to stay deleted`,
  );
}

console.log("button-single-color.test.cjs passed");
