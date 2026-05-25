const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const screenSource = read(path.join("app", "add-players.tsx"));

assert.doesNotMatch(
  screenSource,
  /Create player|Quick Add|Bring a new captain aboard|Player name|Save Player|Tap player to edit or delete|Edit player|Delete Player/,
  "expected app/add-players.tsx to remove generic player creation and roster-edit affordances"
);

assert.match(
  screenSource,
  /Your player card/,
  "expected app/add-players.tsx to focus the Players tab on the signed-in profile card"
);

assert.match(
  screenSource,
  /Delete your profile/,
  "expected app/add-players.tsx to expose a self-delete action instead of arbitrary player deletion"
);

assert.match(
  screenSource,
  /ProfileAppearancePicker/,
  "expected app/add-players.tsx to use the shared profile appearance picker for color and card selection"
);

console.log("add-players-roster-assets-regression.test.cjs passed");
