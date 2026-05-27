const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const historySource = read(path.join("app", "history.tsx"));

assert.doesNotMatch(
  historySource,
  /removeGame\(game\.id\)/,
  "expected app/history.tsx to stop removing finished games from the local store directly",
);

assert.match(
  historySource,
  /deleteCompletedGame\(/,
  "expected app/history.tsx to delete finished games through the Supabase delete helper",
);

assert.match(
  historySource,
  /loadHydratedCloudState|loadHydratedSharedSnapshot/,
  "expected app/history.tsx to rehydrate through the shared helper after deleting or importing history",
);

assert.doesNotMatch(
  historySource,
  /loadCloudSnapshot\(/,
  "expected app/history.tsx to stop reloading games from Supabase inline after deleting or importing history",
);

assert.doesNotMatch(
  historySource,
  /loadRegisteredProfiles\(/,
  "expected app/history.tsx to stop merging registered profiles inline after deleting or importing history",
);

assert.doesNotMatch(
  historySource,
  /loadStatsSnapshot\(/,
  "expected app/history.tsx to stop rebuilding stats inline after deleting or importing history",
);

console.log("history-delete-supabase-only-wireup.test.cjs passed");
