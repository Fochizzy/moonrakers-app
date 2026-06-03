const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const bootstrapSource = read(path.join("lib", "auth", "useSharedCloudBootstrap.ts"));
const gameSource = read(path.join("app", "game.tsx"));

assert.doesNotMatch(
  bootstrapSource,
  /discardUnfinishedGame/,
  "expected auth/bootstrap cleanup to stay on local-only clear paths instead of using explicit cloud-gated discard",
);

assert.match(
  bootstrapSource,
  /clearGameDraft\(\);\s*await remove\("gameDraft"\);/,
  "expected auth/bootstrap cleanup to keep clearing the local draft shadow directly",
);

assert.match(
  gameSource,
  /await deleteUserGameDraft\(gameDraft\.profileId\);[\s\S]*clearGameDraft\(\);[\s\S]*await remove\(['"]gameDraft['"]\);/,
  "expected successful finish cleanup to keep deleting the draft after save succeeds",
);

console.log("unfinished-game-discard-regression.test.cjs passed");
