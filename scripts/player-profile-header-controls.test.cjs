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
  /useAuthProfile/,
  "expected the player profile screen to read authProfile so the quick player chips can anchor on the signed-in Moonrakers profile",
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
  /prioritizeSignedInPlayerOptions/,
  "expected the player profile screen to reuse the shared signed-in quick-pick ordering helper",
);

assert.match(
  source,
  /signedInTopPlayerOptions/,
  "expected the player profile screen to read the signed-in player quick-pick priorities from the server-authored profile payload when available",
);

assert.match(
  source,
  /buildRecentGameOpponentOptions/,
  "expected the player profile screen to fall back to recent-game opponent ordering when the signed-in quick-pick payload is unavailable",
);

assert.match(
  source,
  /ALL_PLAYERS_CHIP_ID/,
  "expected the player profile screen to keep a dedicated All players quick-chip id",
);

assert.match(
  source,
  /label:\s*"All players"/,
  "expected the player profile screen to render an All players quick chip",
);

assert.match(
  source,
  /label:\s*String\(player\.id\) === String\(signedInPlayerChipId \?\? ""\)\.trim\(\)\s*\?\s*"You"\s*:\s*player\.name \|\| "Player"/,
  "expected the player profile screen to show You instead of duplicating the signed-in player's name",
);

assert.doesNotMatch(
  source,
  /badge:\s*String\(player\.id\) === String\(signedInPlayerChipId \?\? ""\)\.trim\(\)\s*\?\s*"You"\s*:\s*null/,
  "expected the player profile screen to drop the separate You badge in the selector items",
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
  /placeholder:\s*"Search User"/,
  "expected the player profile header to expose a Search User input beneath the player name",
);

assert.match(
  source,
  /router\.replace\(buildPlayerProfileRoute\(String\(nextPlayerId\)\)\)/,
  "expected the player profile search results to switch the actual selected profile route",
);

assert.match(
  source,
  /router\.push\(APP_ROUTES\.playerDirectory\)/,
  "expected the All players quick chip to open the shared player directory route",
);

assert.match(
  source,
  /router\.push\(APP_ROUTES\.home\)/,
  "expected the player profile header action to route Command to the shared Command page",
);

assert.match(
  source,
  /Command/,
  "expected the player profile header to display Command instead of Back",
);

assert.doesNotMatch(
  source,
  /Custom profile tabs with player-specific metrics, form, context, and projection signals\./,
  "expected the old custom-profile subtitle copy to be removed from the header",
);

console.log("player-profile-header-controls.test.cjs passed");
