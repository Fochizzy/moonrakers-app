const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "elo.tsx"),
  "utf8",
);

// The rails are driven by the union of players this device has games for and
// players the server already ranked, with the full roster as a fallback. That
// is what keeps an opponent tap alive when a payload refresh returns a
// narrower player list.
assert.match(
  source,
  /const analyticsPlayers = useMemo<StorePlayer\[]>\(\(\) => \{/,
  "expected the ELO screen to build a stable player-option list so opponent taps survive filtered payload refreshes",
);

assert.match(
  source,
  /gameDrivenPlayerIds\.has\(playerId\) \|\| leaderboardPlayerIds\.has\(playerId\)/,
  "expected the ELO screen to merge server-ranked players with the local roster before driving player and opponent rails",
);

assert.match(
  source,
  /return playersWithAnalytics\.length \? playersWithAnalytics : sortedPlayers;/,
  "expected the ELO screen to fall back to the full roster rather than rendering empty rails",
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
