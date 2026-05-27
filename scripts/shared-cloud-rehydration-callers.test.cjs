const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

for (const [label, relPath] of [
  ["bootstrap", path.join("lib", "auth", "useSharedCloudBootstrap.ts")],
  ["game session", path.join("lib", "game-session", "useGameSessionController.ts")],
  ["history manager", path.join("lib", "history", "useHistoryDataManager.ts")],
]) {
  const source = read(relPath);

  assert.match(
    source,
    /loadHydratedCloudState|loadHydratedSharedSnapshot/,
    `expected ${label} to use the shared cloud rehydration helper`,
  );
}

const gameSessionSource = read(path.join("lib", "game-session", "useGameSessionController.ts"));
assert.doesNotMatch(
  gameSessionSource,
  /loadCloudSnapshot\(args\.authSession\.user\.id!\)/,
  "expected game-session refresh to stop inlining loadCloudSnapshot",
);

const historySource = read(path.join("lib", "history", "useHistoryDataManager.ts"));
assert.doesNotMatch(
  historySource,
  /loadCloudSnapshot\(activeSession\.user\.id\)/,
  "expected history refresh to stop inlining loadCloudSnapshot",
);

console.log("shared-cloud-rehydration-callers.test.cjs passed");
