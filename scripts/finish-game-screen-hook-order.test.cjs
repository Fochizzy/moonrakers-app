const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const gameScreenSource = fs.readFileSync(path.join(projectRoot, "app", "game.tsx"), "utf8");

const emptyStateReturnIndex = gameScreenSource.indexOf(
  "if (!activeGame?.players?.length || !activeTurnPlayer || !currentPlayer) {",
);
const headToHeadEffectIndex = gameScreenSource.indexOf(
  "useEffect(() => {\n    if (!headToHeadMissionActive) return;\n    syncHeadToHeadMissionMode();",
);

assert.notEqual(
  emptyStateReturnIndex,
  -1,
  "expected the game screen to guard its empty-state render when no active game is loaded",
);

assert.notEqual(
  headToHeadEffectIndex,
  -1,
  "expected the game screen to keep the head-to-head sync effect in place",
);

assert.ok(
  headToHeadEffectIndex < emptyStateReturnIndex,
  "expected the game screen to finish registering hooks before returning its no-active-game fallback",
);

console.log("finish-game-screen-hook-order.test.cjs passed");
