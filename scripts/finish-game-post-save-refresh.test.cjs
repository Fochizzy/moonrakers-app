const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const controllerSource = read(path.join("lib", "game-session", "useGameSessionController.ts"));
const refreshHelperSource = read(
  path.join("lib", "game-save", "refreshFinishedGameCloudState.ts"),
);

assert.match(
  controllerSource,
  /refreshFinishedGameCloudState/,
  "expected the game-session controller to import the post-save cloud refresh helper",
);

assert.match(
  controllerSource,
  /const savedGameId = await saveCompletedGame\(/,
  "expected the game-session controller to keep the saved game id for post-save refresh work",
);

assert.match(
  controllerSource,
  /await refreshFinishedGameCloudState\(\s*{\s*gameId:\s*String\(savedGameId\),/s,
  "expected the game-session controller to split follow-up analytics refresh into a separate post-save helper",
);

assert.match(
  controllerSource,
  /participantProfileIds:/,
  "expected the post-save refresh call to provide the finished game's registered participants",
);

assert.match(
  refreshHelperSource,
  /rpc\("refresh_completed_game_participant_rollup"/,
  "expected the post-save refresh helper to refresh participant rollups through a dedicated RPC",
);

assert.match(
  refreshHelperSource,
  /rpc\("refresh_elo_rollups"/,
  "expected the post-save refresh helper to refresh the ELO leaderboard through a dedicated RPC",
);

console.log("finish-game-post-save-refresh.test.cjs passed");
