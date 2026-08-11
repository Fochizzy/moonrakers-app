const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const controllerSource = fs.readFileSync(
  path.join(projectRoot, "lib", "game-session", "useGameSessionController.ts"),
  "utf8",
);

const savedGameIdIndex = controllerSource.indexOf(
  "const savedGameId = await saveCompletedGame({",
);
const refreshTryIndex = controllerSource.indexOf(
  "try {\n        publishAppStatus({\n          scope: \"cloud_refresh\",",
);
const earlyDraftCleanupIndex = controllerSource.indexOf("await args.onDraftFinished?.();");

assert.notEqual(
  savedGameIdIndex,
  -1,
  "expected the finish-game controller to keep the cloud save call in place",
);

assert.notEqual(
  refreshTryIndex,
  -1,
  "expected the finish-game controller to keep the post-save cloud refresh block in place",
);

assert.ok(
  earlyDraftCleanupIndex === -1 ||
    earlyDraftCleanupIndex < savedGameIdIndex ||
    earlyDraftCleanupIndex > refreshTryIndex,
  "expected the finish-game controller to stop awaiting draft cleanup between the cloud save and navigation/refresh path",
);

assert.match(
  controllerSource,
  /async function runFinishedGameCleanup\(\)\s*\{\s*try\s*\{\s*await args\.onDraftFinished\?\.\(\);/s,
  "expected the finish-game controller to run draft cleanup after navigation starts",
);

assert.match(
  controllerSource,
  /finally\s*\{\s*args\.clearActiveGame\(\);\s*\}\s*\}/s,
  "expected the finish-game controller to clear the local active game only after cleanup work runs",
);

assert.match(
  controllerSource,
  /args\.router\.replace\(buildHomeRoute\(\)\);\s*await runFinishedGameCleanup\(\);/s,
  "expected the finish-game controller to trigger navigation before running local active-game cleanup",
);

assert.doesNotMatch(
  controllerSource,
  /requestAnimationFrame\(/,
  "expected finished-game cleanup to stay awaited: a requestAnimationFrame callback is dropped when the app backgrounds, stranding the draft row and leaving the finished game resumable",
);

console.log("finish-game-navigation-cleanup-order.test.cjs passed");
