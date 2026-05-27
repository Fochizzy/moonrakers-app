const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "components", "home", "SelectedNamePill.tsx"),
  "utf8",
);

assert.match(
  source,
  /selectedNamePill:\s*\{[\s\S]*borderRadius:\s*10,/s,
  "expected the selected crew name chip to use a rounded-rectangle radius instead of a full capsule",
);

assert.doesNotMatch(
  source,
  /selectedNamePill:\s*\{[\s\S]*borderRadius:\s*999,/s,
  "expected the selected crew name chip to stop using a fully round capsule radius",
);

console.log("selected-name-pill-shape.test.cjs passed");
