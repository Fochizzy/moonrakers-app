const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const screenSource = read(path.join("app", "add-players.tsx"));

assert.match(
  screenSource,
  /APP_ICONS\.fullProfile/,
  "expected app/add-players.tsx to showcase full_profile.png on the roster page"
);

assert.match(
  screenSource,
  /APP_ICONS\.orangePerson/,
  "expected app/add-players.tsx to showcase orange_person.png on the roster page"
);

assert.match(
  screenSource,
  /Ada_Masa\.png/,
  "expected app/add-players.tsx to showcase Ada_Masa.png on the roster page"
);

console.log("add-players-roster-assets-regression.test.cjs passed");
