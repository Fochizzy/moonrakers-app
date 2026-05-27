const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "player-profile", "index.tsx"),
  "utf8",
);

assert.match(
  source,
  /useGroups,\s*usePlayers/,
  "expected the player directory to read both players and groups from the shared store",
);

assert.match(
  source,
  /canonicalizeSelectablePlayers/,
  "expected the player directory to import the shared registered-profile canonicalizer",
);

assert.match(
  source,
  /const playerDirectory = useMemo\(\s*\(\) => canonicalizeSelectablePlayers\(rawPlayers, rawGroups\)/s,
  "expected the player directory to collapse duplicate local and registered players before routing",
);

assert.match(
  source,
  /playerDirectory\.players/,
  "expected the visible player cards to render from the canonicalized directory",
);

assert.match(
  source,
  /router\.push\(buildPlayerProfileRoute\(player\.id\)\)/,
  "expected player cards to route using the canonicalized player id",
);

console.log("player-directory-canonical-routing.test.cjs passed");
