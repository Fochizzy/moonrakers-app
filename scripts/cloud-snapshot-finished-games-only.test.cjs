const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const cloudSnapshotSource = read(path.join("lib", "cloud", "loadCloudSnapshot.ts"));

assert.match(
  cloudSnapshotSource,
  /\.from\("games"\)[\s\S]*?\.eq\("status", "finished"\)/,
  "expected loadCloudSnapshot to exclude non-finished games so active cloud rows never affect local stats or profile fallbacks",
);

console.log("cloud-snapshot-finished-games-only.test.cjs passed");
