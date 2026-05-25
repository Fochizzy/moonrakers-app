const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const layoutSource = read(path.join("app", "_layout.tsx"));
const addPlayersSource = read(path.join("app", "add-players.tsx"));

assert.doesNotMatch(
  layoutSource,
  /clearLocalCacheSnapshot|persistLocalCacheSnapshot/,
  "expected app/_layout.tsx to stop wiring local app-data cache helpers",
);

assert.doesNotMatch(
  addPlayersSource,
  /persistLocalCacheSnapshot/,
  "expected app/add-players.tsx to stop writing players/groups/games into local cache during profile deletion",
);

assert.equal(
  fs.existsSync(path.join(projectRoot, "lib", "localCache", "clearLocalCacheSnapshot.ts")),
  false,
  "expected the local app-data cache clearing helper to be removed",
);

assert.equal(
  fs.existsSync(path.join(projectRoot, "lib", "localCache", "persistLocalCacheSnapshot.ts")),
  false,
  "expected the local app-data cache persistence helper to be removed",
);

console.log("cloud-snapshot-cache-boundary.test.cjs passed");
