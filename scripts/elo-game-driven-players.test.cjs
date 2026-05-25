const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "elo.tsx"),
  "utf8",
);

assert.match(
  source,
  /const gameDrivenPlayerIds = useMemo\(\(\) => \{\s*return new Set\(/s,
  "expected Elo screen to derive player ids from saved games",
);

assert.match(
  source,
  /const analyticsPlayers = useMemo<StorePlayer\[]>\(\(\) => \{\s*const playersWithSavedGames = sortedPlayers\.filter/s,
  "expected Elo screen to build an analytics player list from saved-game participants",
);

assert.match(
  source,
  /return playersWithSavedGames\.length \? playersWithSavedGames : sortedPlayers;/,
  "expected Elo screen to fall back to the full roster only when no saved-game players exist",
);

assert.match(
  source,
  /buildGameRowsByPlayer\(games, analyticsPlayers\)/,
  "expected Elo rows to be driven by game-participating players",
);

assert.match(
  source,
  /return analyticsPlayers\s*\.map\(/s,
  "expected Elo leaderboard rows to be built from the analytics player list",
);

assert.match(
  source,
  /const filteredPlayerOptions = useMemo\(\(\) => \{/,
  "expected the Elo player selector to derive filtered quick-select options from the analytics player list",
);

assert.match(
  source,
  /\{filteredPlayerOptions\.map\(\(player\) => \{/,
  "expected the Elo player tabs to render the filtered analytics player options",
);

console.log("elo-game-driven-players.test.cjs passed");
