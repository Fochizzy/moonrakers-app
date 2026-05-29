const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "charts", "index.tsx"),
  "utf8",
);

assert.match(
  source,
  /const\s+authProfile\s*=\s*useStore\(\(state:\s*any\)\s*=>\s*state\?\.authProfile\s*\?\?\s*null\)/,
  "expected the chart setup screen to read authProfile so it can default the focus player to the signed-in user",
);

assert.match(
  source,
  /const\s+\[focusPlayerSearch,\s*setFocusPlayerSearch\]\s*=\s*useState\(""\)/,
  "expected the chart setup screen to track a local focusPlayerSearch state",
);

assert.match(
  source,
  /const\s+deferredFocusPlayerSearch\s*=\s*useDeferredValue\(focusPlayerSearch\);/,
  "expected the chart setup screen to defer focus-player search work while typing",
);

assert.match(
  source,
  /resolvePreferredChartPlayerId\(\{[\s\S]*availablePlayers:\s*focusPlayerDirectoryPlayers,[\s\S]*authProfileId:\s*authProfile\?\.id,[\s\S]*authSessionUserId:\s*authSession\?\.user\?\.id,[\s\S]*\}\)/,
  "expected the chart setup screen to derive its preferred focus player from the signed-in user",
);

assert.match(
  source,
  /buildCommonOpponentOptions\(\{[\s\S]*playerId:\s*preferredFocusPlayerId,[\s\S]*limit:\s*3[\s\S]*\}\)/,
  "expected the chart setup screen to derive the top three most-played tablemates for the quick focus-player strip",
);

assert.match(
  source,
  /if\s*\(!activeId\s*\|\|\s*!hasActivePlayer\)\s*\{\s*setSelectedPlayerId\(\s*preferredFocusPlayerId\s*\?\?\s*\(focusPlayerOptions\[0\]\s*\?\s*String\(focusPlayerOptions\[0\]\.key\)\s*:\s*null\)\s*\);/s,
  "expected the chart setup screen to default the focus player to the preferred signed-in user before falling back",
);

assert.doesNotMatch(
  source,
  /You first, then your most-played tablemates\./,
  "expected the focus-player helper copy to be removed from the setup rail",
);

assert.match(
  source,
  /<SetupSection[\s\S]*title="Focus player"[\s\S]*contentStyle=\{styles\.setupFullWidthSectionContent\}[\s\S]*<SetupSegmentedTabs[\s\S]*items=\{primaryFocusPlayerOptions\}/s,
  "expected the focus-player section to render its signed-in-first quick picks inside the full-width setup layout",
);

assert.match(
  source,
  /const\s+primaryFocusPlayerOptions\s*=\s*useMemo\(\s*\(\)\s*=>[\s\S]*buildPrimarySetupOptions\([\s\S]*orderedFocusPlayerOptions,[\s\S]*\[selectedPlayerId,\s*signedInFocusPlayerOptionId\],[\s\S]*4,/s,
  "expected the focus-player quick picks to prioritize the signed-in player in the primary segmented row",
);

assert.match(
  source,
  /placeholder="Search player"/,
  "expected the chart setup screen to render a Search player input underneath the quick picks",
);

assert.match(
  source,
  /inputProps=\{\{\s*placeholderTextColor:\s*CHART_COLORS\.sub,\s*returnKeyType:\s*"search",\s*style:\s*styles\.setupSearchInput,\s*\}\}/,
  "expected the focus-player search field to use the chart-specific muted placeholder styling",
);

assert.match(
  source,
  /focusPlayerSearch\.trim\(\)\s*\?\s*\([\s\S]*filteredFocusPlayerOptions\.length[\s\S]*<SetupSegmentedTabs[\s\S]*items=\{filteredFocusPlayerOptions\}/s,
  "expected the chart setup screen to expand focus-player browsing when a search query is present",
);

console.log("chart-focus-player-selector.test.cjs passed");
