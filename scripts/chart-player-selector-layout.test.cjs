const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "index.tsx"),
  "utf8",
);

assert.match(
  source,
  /const primaryFocusPlayerOptions = useMemo\(/,
  "expected the charts route to derive a short segmented focus-player tab set",
);

assert.match(
  source,
  /label:\s*"You"/,
  "expected the chart setup selectors to relabel the signed-in player to You",
);

assert.match(
  source,
  /const visibleScopePlayerTabOptions = useMemo\(/,
  "expected the charts route to derive a visible segmented scope-player tab set",
);

assert.match(
  source,
  /function SetupSegmentedTabs\(/,
  "expected the charts route to define a shared segmented-tab selector for the player scope controls",
);

assert.match(
  source,
  /<SetupSegmentedTabs[\s\S]*items=\{primaryFocusPlayerOptions\}[\s\S]*<PlayerSearchPicker/s,
  "expected the focus-player section to render segmented-style tabs above the search input",
);

assert.match(
  source,
  /<SetupSegmentedTabs[\s\S]*items=\{visibleScopePlayerTabOptions\}[\s\S]*selectionMode="multiple"[\s\S]*columns=\{2\}[\s\S]*<PlayerSearchPicker/s,
  "expected the scope-player section to render two-column segmented multi-select tabs above the search input",
);

assert.match(
  source,
  /const TOGGLE_SCOPE_PLAYER_LIST_KEY = "__toggle_scope_player_list__";/,
  "expected the charts route to define a shared Show all scope-tab id",
);

assert.doesNotMatch(
  source,
  /SELECT_ALL_SCOPE_PLAYERS_KEY|All selected|Select all/,
  "expected the old Select all scope-tab flow to be removed from the charts route",
);

assert.doesNotMatch(
  source,
  /function ScopeTab\(/,
  "expected the custom underline scope-tab component to be removed in favor of segmented tabs",
);

console.log("chart-player-selector-layout.test.cjs passed");
