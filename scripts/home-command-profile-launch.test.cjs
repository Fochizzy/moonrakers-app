const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const screenSource = read(path.join("app", "index.tsx"));

assert.match(
  screenSource,
  /const\s+signedInPlayerId\s*=\s*useMemo\(/,
  "expected app/index.tsx to derive the signed-in player id before opening the player hub route",
);

assert.match(
  screenSource,
  /const\s+focusPlayer\s*=\s*rankedPlayers\.find\(\(player\)\s*=>\s*player\.id\s*===\s*signedInPlayerId\)\s*\?\?\s*selectedPlayers\[0\]\s*\?\?\s*rankedPlayers\[0\];/s,
  "expected app/index.tsx to prefer the logged-in player before falling back to selected or ranked players",
);

assert.match(
  screenSource,
  /router\.push\(buildPlayerProfileRoute\(focusPlayer\.id\)\);/,
  "expected app/index.tsx to open the resolved focusPlayer profile route",
);

console.log("home-command-profile-launch.test.cjs passed");
