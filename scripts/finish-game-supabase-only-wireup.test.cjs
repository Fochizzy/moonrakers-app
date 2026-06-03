const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const gameSource = read(path.join("app", "game.tsx"));
const gameSessionSource = read(path.join("lib", "game-session", "useGameSessionController.ts"));

assert.doesNotMatch(
  gameSource,
  /addGame\(/,
  "expected app/game.tsx to stop inserting completed games into the local store after the Supabase save",
);

assert.match(
  gameSessionSource,
  /hydrateCloudSnapshot\(\s*hydratedSnapshot\s*\)/,
  "expected the shared game session controller to refresh the hydrated cloud snapshot after finishing a game",
);

assert.match(
  gameSessionSource,
  /loadHydratedCloudState|loadHydratedSharedSnapshot/,
  "expected the shared game session controller to refresh finished-game data through the shared hydration helper",
);

assert.doesNotMatch(
  gameSource,
  /loadCloudSnapshot\(/,
  "expected app/game.tsx to stop reloading finished-game data inline from Supabase",
);

assert.doesNotMatch(
  gameSource,
  /loadRegisteredProfiles\(/,
  "expected app/game.tsx to stop merging registered profiles inline after finishing a game",
);

assert.doesNotMatch(
  gameSource,
  /loadStatsSnapshot\(/,
  "expected app/game.tsx to stop rebuilding the stats snapshot inline after finishing a game",
);

console.log("finish-game-supabase-only-wireup.test.cjs passed");
