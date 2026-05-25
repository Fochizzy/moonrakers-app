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
  /Delete My Profile/,
  "expected app/add-players.tsx to expose a delete action only for the signed-in player's own profile",
);

assert.doesNotMatch(
  screenSource,
  /Delete Player/,
  "expected generic player deletion copy to be removed from app/add-players.tsx",
);

assert.match(
  screenSource,
  /setPlayers\s*\(\s*players\.filter\(\(player\)\s*=>\s*player\.id\s*!==\s*activePlayerId\)\s*\)/,
  "expected self-profile deletion to remove only the signed-in player from the local roster without using the broad removePlayer cleanup path",
);

console.log("add-players-own-profile-delete.test.cjs passed");
