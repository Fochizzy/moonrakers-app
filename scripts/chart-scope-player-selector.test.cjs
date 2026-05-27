const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "charts", "index.tsx"),
  "utf8",
);

assert.match(
  source,
  /const\s+\[scopePlayerSearch,\s*setScopePlayerSearch\]\s*=\s*useState\(""\)/,
  "expected the chart setup screen to track a local scopePlayerSearch state",
);

assert.match(
  source,
  /const\s+deferredScopePlayerSearch\s*=\s*useDeferredValue\(scopePlayerSearch\);/,
  "expected the chart setup screen to defer scope-player search work while typing",
);

assert.match(
  source,
  /resolvePreferredChartPlayerId\(\{[\s\S]*availablePlayers:\s*scopePlayerDirectoryPlayers,[\s\S]*routePlayerId:\s*null,[\s\S]*authProfileId:\s*authProfile\?\.id,[\s\S]*authSessionUserId:\s*authSession\?\.user\?\.id,[\s\S]*\}\)/,
  "expected the scope quick picks to anchor on the signed-in player before any route-selected focus player",
);

assert.match(
  source,
  /buildCommonOpponentOptions\(\{[\s\S]*playerId:\s*preferredScopePlayerId,[\s\S]*players:\s*scopePlayerDirectoryPlayers,[\s\S]*limit:\s*4[\s\S]*\}\)/,
  "expected the scope quick picks to include the signed-in player and their top four most-played tablemates",
);

assert.match(
  source,
  /subtitle="Logged-in player first, then your most-played tablemates\."/,
  "expected the Players in scope section to explain the new quick-pick ordering",
);

assert.match(
  source,
  /quickScopePlayerOptions\.map\(\(player\)\s*=>/,
  "expected the Players in scope section to render a dedicated quick-pick strip before the full search results",
);

assert.match(
  source,
  /badge:\s*String\(option\.key\) === signedInId \?\s*"You"\s*:\s*null/,
  "expected the scope quick picks to badge the signed-in player as You",
);

assert.match(
  source,
  /key:\s*ALL_SCOPE_PLAYERS_CHIP_ID,[\s\S]*label:\s*"All players",[\s\S]*kind:\s*"action"/,
  "expected the scope quick picks to append an All players action chip after the signed-in-first shortlist",
);

assert.match(
  source,
  /placeholder="Player Search"/,
  "expected the Players in scope section to render a Player Search input under the quick picks",
);

assert.match(
  source,
  /scopePlayerSearch\.trim\(\)\s*\|\|\s*showAllScopePlayerOptions/,
  "expected the chart setup screen to expand scope-player browsing when the All players chip is opened or a search query exists",
);

console.log("chart-scope-player-selector.test.cjs passed");
