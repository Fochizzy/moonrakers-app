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
  /const\s+allPlayedScopePlayers\s*=\s*useMemo\(\s*\(\)\s*=>[\s\S]*buildCommonOpponentOptions\(\{[\s\S]*playerId:\s*preferredScopePlayerId,[\s\S]*players:\s*scopePlayerDirectoryPlayers,[\s\S]*limit:\s*scopePlayerDirectoryPlayers\.length[\s\S]*\}\)/s,
  "expected the scope selector to derive the full played-with roster from the signed-in player history",
);

assert.match(
  source,
  /buildCommonOpponentOptions\(\{[\s\S]*playerId:\s*preferredScopePlayerId,[\s\S]*players:\s*scopePlayerDirectoryPlayers,[\s\S]*limit:\s*3[\s\S]*\}\)/,
  "expected the collapsed scope rail to derive the top three most-played tablemates for the preview row",
);

assert.match(
  source,
  /const\s+scopeAllowedPlayerIds\s*=\s*useMemo\(\s*\(\)\s*=>[\s\S]*new Set<string>\([\s\S]*allPlayedScopePlayers[\s\S]*signedInScopePlayerOptionId[\s\S]*preferredScopePlayerId/s,
  "expected the scope selector to limit visible players to the signed-in user and people they have actually played with",
);

assert.match(
  source,
  /const\s+scopePlayerOptions\s*=\s*useMemo\(/,
  "expected the scope selector to derive a filtered scope-player option list",
);

assert.match(
  source,
  /setupScopePlayerOptions\.filter\(\s*\(option\)\s*=>[\s\S]*scopeAllowedPlayerIds\.has\(String\(option\.key\)\)\s*\)/s,
  "expected the scope selector to filter its setup options down to the played-with roster",
);

assert.doesNotMatch(
  source,
  /Logged-in player first, then your most-played tablemates\./,
  "expected the Players in scope helper copy to be removed from the setup rail",
);

assert.match(
  source,
  /const\s+\[showAllScopePlayerOptions,\s*setShowAllScopePlayerOptions\]\s*=\s*useState\(false\);/,
  "expected the scope selector to track whether the full played-with roster is expanded",
);

assert.match(
  source,
  /const\s+collapsedScopePlayerOptions\s*=\s*useMemo\(\s*\(\)\s*=>[\s\S]*buildPrimarySetupOptions\([\s\S]*orderedScopePlayerOptions,[\s\S]*signedInScopePlayerOptionId,[\s\S]*topCommonScopePlayers[\s\S]*4/s,
  "expected the collapsed scope rail to show the signed-in player plus the top three most-played tablemates",
);

assert.match(
  source,
  /const\s+visibleScopePlayerTabOptions\s*=\s*useMemo\(\s*\(\)\s*=>[\s\S]*showAllScopePlayerOptions\s*\?\s*orderedScopePlayerOptions\s*:\s*collapsedScopePlayerOptions[\s\S]*TOGGLE_SCOPE_PLAYER_LIST_KEY[\s\S]*Show all/s,
  "expected the Players in scope section to show only the collapsed preview row until the Show all action is used",
);

assert.match(
  source,
  /if\s*\(nextPlayerId === TOGGLE_SCOPE_PLAYER_LIST_KEY\)\s*\{[\s\S]*setShowAllScopePlayerOptions\(\(current\)\s*=>\s*!current\);[\s\S]*return;/,
  "expected the scope toggle handler to expand or collapse the full played-with roster",
);

assert.match(
  source,
  /placeholder="Search player"/,
  "expected the Players in scope section to render a Search player input under the quick picks",
);

assert.match(
  source,
  /inputProps=\{\{\s*placeholderTextColor:\s*CHART_COLORS\.sub,\s*returnKeyType:\s*"search",\s*style:\s*styles\.setupSearchInput,\s*\}\}/,
  "expected the scope-player search field to use the chart-specific muted placeholder styling",
);

assert.match(
  source,
  /<SetupSegmentedTabs[\s\S]*items=\{visibleScopePlayerTabOptions\}[\s\S]*selectedKeys=\{scopeSegmentedSelectedKeys\}[\s\S]*selectionMode="multiple"[\s\S]*columns=\{2\}/s,
  "expected the Players in scope section to render two-column segmented multi-select tabs for the full scope list",
);

console.log("chart-scope-player-selector.test.cjs passed");
