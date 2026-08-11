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
  /const analyticsPlayers = useMemo<StorePlayer\[]>\(\(\) => \{[\s\S]*const playersWithAnalytics = sortedPlayers\.filter/s,
  "expected Elo screen to build an analytics player list from tracked players",
);

// A player counts as tracked when this device has their games OR the server
// already ranked them; filtering on local games alone drops server rows whenever
// the store is only partially hydrated.
assert.match(
  source,
  /gameDrivenPlayerIds\.has\(playerId\) \|\| leaderboardPlayerIds\.has\(playerId\)/,
  "expected Elo screen to keep server-ranked players that have no locally hydrated games",
);

assert.match(
  source,
  /return playersWithAnalytics\.length \? playersWithAnalytics : sortedPlayers;/,
  "expected Elo screen to fall back to the full roster only when no tracked players exist",
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
