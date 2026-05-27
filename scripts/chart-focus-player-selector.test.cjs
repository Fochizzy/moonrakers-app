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

assert.match(
  source,
  /subtitle="You first, then your most-played tablemates\."/,
  "expected the focus-player section to explain the quick-pick ordering",
);

assert.match(
  source,
  /items=\{quickFocusPlayerOptions\}/,
  "expected the focus-player section to render quick picks for the signed-in player and common teammates",
);

assert.match(
  source,
  /badge:\s*String\(option\.key\) === signedInId \?\s*"You"\s*:\s*null/,
  "expected the focus-player quick picks to badge the signed-in player as You",
);

assert.match(
  source,
  /key:\s*ALL_FOCUS_PLAYERS_CHIP_ID,[\s\S]*label:\s*"All players",[\s\S]*kind:\s*"action"/,
  "expected the focus-player quick picks to append an All players action chip after the signed-in-first shortlist",
);

assert.match(
  source,
  /placeholder="Search for Player"/,
  "expected the chart setup screen to render a Search for Player input underneath the quick picks",
);

assert.match(
  source,
  /focusPlayerSearch\.trim\(\)\s*\|\|\s*showAllFocusPlayerOptions/,
  "expected the chart setup screen to expand focus-player browsing when the All players chip is opened or a search query exists",
);

console.log("chart-focus-player-selector.test.cjs passed");
