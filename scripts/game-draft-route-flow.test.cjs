const fs = require("node:fs");
const assert = require("node:assert/strict");
const path = require("node:path");

// Guards must resolve files relative to the repo, not this machine.
const projectRoot = path.resolve(__dirname, "..");

const home = fs.readFileSync(path.join(projectRoot, "app/index.tsx"), "utf8");
const setup = fs.readFileSync(
  path.join(projectRoot, "app/game-setup.tsx"),
  "utf8",
);
const game = fs.readFileSync(path.join(projectRoot, "app/game.tsx"), "utf8");
const roster = fs.readFileSync(
  path.join(projectRoot, "app/add-players.tsx"),
  "utf8",
);
const phase = fs.readFileSync(
  path.join(projectRoot, "lib/game-draft/phase.ts"),
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
