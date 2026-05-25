const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const gameSource = read(path.join("app", "game.tsx"));

assert.doesNotMatch(
  gameSource,
  /addGame\(/,
  "expected app/game.tsx to stop inserting completed games into the local store after the Supabase save",
);

assert.match(
  gameSource,
  /hydrateCloudSnapshot/,
  "expected app/game.tsx to refresh the hydrated cloud snapshot after finishing a game",
);

assert.match(
  gameSource,
  /loadCloudSnapshot\(/,
  "expected app/game.tsx to reload finished-game data from Supabase",
);

assert.match(
  gameSource,
  /loadRegisteredProfiles\(/,
  "expected app/game.tsx to merge registered profiles back into the refreshed Supabase snapshot",
);

assert.match(
  gameSource,
  /loadStatsSnapshot\(/,
  "expected app/game.tsx to refresh the stats snapshot from Supabase after finishing a game",
);

console.log("finish-game-supabase-only-wireup.test.cjs passed");
