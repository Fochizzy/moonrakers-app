const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const layoutSource = read(path.join("app", "_layout.tsx"));
const helperMatch = layoutSource.match(
  /async function loadLocalSnapshot\(\)\s*\{([\s\S]*?)\n\}/,
);

assert.ok(
  helperMatch,
  "expected _layout.tsx to define loadLocalSnapshot()",
);

const helperBody = helperMatch[1];

assert.doesNotMatch(
  helperBody,
  /loadGroups\(\)/,
  "expected _layout.tsx to stop loading local groups during bootstrap",
);

const promiseAllMatch = helperBody.match(
  /const\s*\[\s*players\s*,\s*games\s*\]\s*=\s*await\s*Promise\.all\s*\(\s*\[([\s\S]*?)\]\s*\)/s,
);

assert.ok(
  promiseAllMatch,
  "expected loadLocalSnapshot to await Promise.all for local players and games",
);

const loadCalls = Array.from(
  promiseAllMatch[1].matchAll(/load[A-Za-z]+\(\)/g),
  (match) => match[0],
);

assert.deepStrictEqual(
  loadCalls,
  ["loadPlayers()", "loadGames()"],
  "expected loadLocalSnapshot to keep only local players and games",
);

assert.match(
  helperBody,
  /groups:\s*\[\],/,
  "expected loadLocalSnapshot to return an empty local groups array",
);

console.log("shared-groups-cloud-only-bootstrap.test.cjs passed");
