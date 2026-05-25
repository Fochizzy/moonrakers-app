const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "player-profile", "[playerId].tsx"),
  "utf8",
);

assert.match(
  source,
  /useDeferredValue/,
  "expected the player profile screen to defer search filtering work while typing",
);

assert.match(
  source,
  /TextInput/,
  "expected the player profile screen to import a TextInput for player search",
);

assert.match(
  source,
  /from "@\/utils\/appRoutes"/,
  "expected the player profile screen to import shared app route helpers",
);

assert.match(
  source,
  /const \[playerSearchQuery,\s*setPlayerSearchQuery\] = useState\(""\);/,
  "expected the player profile screen to track a Search User query",
);

assert.match(
  source,
  /const deferredPlayerSearchQuery = useDeferredValue\(playerSearchQuery\);/,
  "expected the player profile screen to defer the Search User query",
);

assert.match(
  source,
  /placeholder="Search User"/,
  "expected the player profile header to expose a Search User input beneath the player name",
);

assert.match(
  source,
  /router\.replace\(buildPlayerProfileRoute\(String\(nextPlayerId\)\)\)/,
  "expected the player profile search results to switch the actual selected profile route",
);

assert.match(
  source,
  /router\.push\(APP_ROUTES\.home\)/,
  "expected the player profile header action to route Back to Command to the shared Command page",
);

assert.match(
  source,
  /Back to Command/,
  "expected the player profile header to display Back to Command instead of Back",
);

assert.doesNotMatch(
  source,
  /Custom profile tabs with player-specific metrics, form, context, and projection signals\./,
  "expected the old custom-profile subtitle copy to be removed from the header",
);

console.log("player-profile-header-controls.test.cjs passed");
