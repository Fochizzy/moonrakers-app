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
  /loadCloudSnapshot\(/,
  "expected app/history.tsx to reload games from Supabase after deleting a finished game",
);

assert.match(
  historySource,
  /loadRegisteredProfiles\(/,
  "expected app/history.tsx to merge registered profiles into the refreshed cloud snapshot after deleting a game",
);

assert.match(
  historySource,
  /loadStatsSnapshot\(/,
  "expected app/history.tsx to refresh stats after deleting a finished game",
);

assert.match(
  historySource,
  /hydrateCloudSnapshot\(\{/,
  "expected app/history.tsx to rehydrate the shared cloud snapshot after deleting a finished game",
);

console.log("history-delete-supabase-only-wireup.test.cjs passed");
