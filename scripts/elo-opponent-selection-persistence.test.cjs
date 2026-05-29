const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "elo.tsx"),
  "utf8",
);

assert.match(
  source,
  /const storePlayerOptions = useMemo<StorePlayer\[]>\(/,
  "expected the ELO screen to build a stable local player-option fallback so opponent taps survive filtered payload refreshes",
);

assert.match(
  source,
  /const analyticsPlayers = useMemo<StorePlayer\[]>\(\(\) => \{[\s\S]*const mergedPlayers = new Map<string,\s*StorePlayer>\(\);[\s\S]*rawPlayerOptions[\s\S]*storePlayerOptions[\s\S]*return Array\.from\(mergedPlayers\.values\(\)\);[\s\S]*\}, \[rawPlayerOptions, storePlayerOptions\]\);/,
  "expected the ELO screen to merge server player options with the local roster before driving player and opponent rails",
);

assert.match(
  source,
  /const isValidOpponent = opponentOptions\.some\(/,
  "expected opponent validity checks to read from the rendered opponent rail instead of the transient query payload",
);

assert.match(
  source,
  /\}, \[opponentOptions, selectedOpponentId, selectedPlayerId\]\);/,
  "expected the opponent reset effect to track the stable opponent rail dependencies",
);

console.log("elo-opponent-selection-persistence.test.cjs passed");
