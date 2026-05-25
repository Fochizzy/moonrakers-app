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

assert.match(home, /useSyncedGameDraft/);
assert.match(home, /Resume/);
assert.match(home, /Start over/);
assert.doesNotMatch(home, /selectedPlayers:\s*JSON\.stringify/);

assert.match(setup, /useSyncedGameDraft/);
assert.match(setup, /beginGameplay/);

assert.match(game, /useSyncedGameDraft/);
assert.match(game, /updateGameplay/);

assert.match(roster, /Resume draft/);
assert.match(roster, /unfinished draft/i);

console.log("game-draft-route-flow.test.cjs passed");
