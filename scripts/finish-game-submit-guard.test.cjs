const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const controllerSource = read(path.join("lib", "game-session", "useGameSessionController.ts"));
const gameSource = read(path.join("app", "game.tsx"));

assert.match(
  controllerSource,
  /const \[isFinishingGame, setIsFinishingGame\] = useState\(false\);/,
  "expected useGameSessionController to track an in-flight finish-game save state",
);

assert.match(
  controllerSource,
  /if \(isFinishingGame\) \{\s*return;\s*\}/,
  "expected useGameSessionController to bail out when a finish-game save is already running",
);

assert.match(
  controllerSource,
  /isFinishingGame,\s*commitFinishGame/,
  "expected useGameSessionController to expose the in-flight finish-game state",
);

assert.match(
  gameSource,
  /finishDisabled:\s*boolean;/,
  "expected ActionsSection to accept a finishDisabled prop for the finish-game CTA",
);

assert.match(
  gameSource,
  /disabled=\{finishDisabled\}[\s\S]*onPress=\{onFinishGame\}/,
  "expected the finish-game button to disable itself while a save is in flight",
);

assert.match(
  gameSource,
  /finishDisabled=\{isFinishingGame\}/,
  "expected app/game.tsx to wire the shared finish-game loading state into ActionsSection",
);

assert.doesNotMatch(
  gameSource,
  /await commitFinishGame\(\);[\s\S]*loadHydratedCloudState\(authSession as any\)/,
  "expected app/game.tsx to stop reloading the shared cloud snapshot after commitFinishGame because the controller already rehydrates it",
);

console.log("finish-game-submit-guard.test.cjs passed");
