const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const saveSource = read(path.join("lib", "game-save", "saveCompletedGame.ts"));
const importSource = read(path.join("lib", "migration", "refreshRollupsAfterLegacyImport.ts"));

assert.match(
  saveSource,
  /rpc\("save_completed_game"/,
  "expected saveCompletedGame to persist completed games through the save_completed_game RPC",
);

assert.doesNotMatch(
  saveSource,
  /refreshServerAuthoredAnalytics/,
  "expected saveCompletedGame to avoid a redundant client-side analytics refresh after the server save",
);

assert.match(
  importSource,
  /refreshServerAuthoredAnalytics/,
  "expected refreshRollupsAfterLegacyImport to refresh server-authored analytics after the import rollup refresh",
);

console.log("analytics-refresh-wiring.test.cjs passed");
