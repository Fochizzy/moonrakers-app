const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const projectRoot = path.resolve(__dirname, "..");
const home = fs.readFileSync(path.join(projectRoot, "app", "index.tsx"), "utf8");
const game = fs.readFileSync(path.join(projectRoot, "app", "game.tsx"), "utf8");

assert.match(
  home,
  /ensureDraftForLegacyActiveGame/,
  "expected the home screen to read ensureDraftForLegacyActiveGame from useSyncedGameDraft",
);

assert.match(
  home,
  /await ensureDraftForLegacyActiveGame\(activeGame\);[\s\S]*router\.push\(APP_ROUTES\.game/,
  "expected the home continue flow to convert the legacy active game before routing to /game",
);

assert.match(
  game,
  /ensureDraftForLegacyActiveGame/,
  "expected the game screen to read ensureDraftForLegacyActiveGame from useSyncedGameDraft",
);

assert.match(
  game,
  /if \(!activeGame \|\| gameDraft \|\| !authSession\?\.user\?\.id\) \{\s*return;\s*\}[\s\S]*void ensureDraftForLegacyActiveGame\(activeGame/,
  "expected the game screen to safety-net convert legacy active state on direct entry",
);

console.log("legacy-active-game-resume-route.test.cjs passed");
