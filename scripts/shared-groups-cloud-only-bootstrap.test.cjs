const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const layoutSource = read(path.join("app", "_layout.tsx"));
assert.doesNotMatch(
  layoutSource,
  /async function loadLocalSnapshot\(/,
  "expected _layout.tsx to remove the local app-data snapshot helper",
);

assert.doesNotMatch(
  layoutSource,
  /loadPlayers\(\)|loadGames\(\)/,
  "expected _layout.tsx to stop loading local players and games during auth bootstrap",
);

assert.match(
  layoutSource,
  /if\s*\(!session\?\.user\?\.id\)\s*\{[\s\S]*?clearAuthState\(\);[\s\S]*?setPlayers\(\[\]\s+as any\);[\s\S]*?setGroups\(\[\]\s+as any\);[\s\S]*?setGames\(\[\]\s+as any\);/s,
  "expected signed-out bootstrap to clear store data instead of restoring local app data",
);

assert.match(
  layoutSource,
  /if\s*\(!profile\?\.player_name\)\s*\{[\s\S]*?setPlayers\(\[\]\s+as any\);[\s\S]*?setGroups\(\[\]\s+as any\);[\s\S]*?setGames\(\[\]\s+as any\);[\s\S]*?hydrateAuthBootstrap\(\{\s*session,\s*profile\s*\}\);/s,
  "expected incomplete-profile bootstrap to keep app data empty instead of restoring local app data",
);

console.log("shared-groups-cloud-only-bootstrap.test.cjs passed");
