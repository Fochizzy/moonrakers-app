const fs = require("node:fs");
const assert = require("node:assert/strict");

const home = fs.readFileSync("C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx", "utf8");
const setup = fs.readFileSync(
  "C:/Users/izzyh/Desktop/moonrakers-app/app/game-setup.tsx",
  "utf8",
);
const game = fs.readFileSync("C:/Users/izzyh/Desktop/moonrakers-app/app/game.tsx", "utf8");
const roster = fs.readFileSync(
  "C:/Users/izzyh/Desktop/moonrakers-app/app/add-players.tsx",
  "utf8",
);
const phase = fs.readFileSync(
  "C:/Users/izzyh/Desktop/moonrakers-app/lib/game-draft/phase.ts",
  "utf8",
);

assert.match(home, /useSyncedGameDraft/);
assert.match(home, /confirmDeleteActiveGame/);
assert.match(home, /discardUnfinishedGame/);
assert.match(
  home,
  /if \(activeGame\) \{\s*confirmDeleteActiveGame\(\);\s*return;\s*\}/s,
);
assert.match(home, /ensureDraftForLegacyActiveGame/);
assert.match(home, /router\.push\(APP_ROUTES\.game/);
assert.doesNotMatch(home, /onPress:\s*clearActiveGame/);
assert.doesNotMatch(home, /Unfinished Draft/);
assert.doesNotMatch(home, /Resume where you left off/);
assert.doesNotMatch(home, /promptForExistingDraft/);
assert.doesNotMatch(home, /Start over/);
assert.doesNotMatch(home, /selectedPlayers:\s*JSON\.stringify/);

assert.match(setup, /useSyncedGameDraft/);
assert.match(setup, /beginGameplay/);

assert.match(game, /useSyncedGameDraft/);
assert.match(game, /updateGameplay/);

assert.doesNotMatch(roster, /Resume draft/);
assert.doesNotMatch(roster, /unfinished draft/i);

assert.match(phase, /return Boolean\(draft && isGameplayDraftPhase\(draft\.phase\)\);/);

console.log("game-draft-route-flow.test.cjs passed");
