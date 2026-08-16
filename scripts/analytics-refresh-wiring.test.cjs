const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const saveSource = read(path.join("lib", "game-save", "saveCompletedGame.ts"));
const importSource = read(path.join("lib", "migration", "importLegacyPayload.ts"));

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

// Importing a backup writes games straight into Supabase, so the rollups have
// to be rebuilt server-side before any screen reads them back. Like the save
// path above, it does not additionally refresh analytics from the client.
assert.match(
  importSource,
  /rpc\(\s*"refresh_rollups_after_legacy_import"/,
  "expected the legacy import to rebuild rollups server-side once games land",
);

assert.match(
  importSource,
  /if \(importedGames > 0\) \{/,
  "expected the rollup refresh to be skipped when an import added no games",
);

console.log("analytics-refresh-wiring.test.cjs passed");
