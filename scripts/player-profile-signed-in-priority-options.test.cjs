const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationDir = path.join(__dirname, "..", "supabase", "migrations");
const migrationFiles = fs
  .readdirSync(migrationDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();
// Later player-profile migrations only wrap or re-grant the RPC, so pick the
// most recent one that actually defines the quick-player rail payload rather
// than whichever file sorts last.
const latestProfileMigration = migrationFiles
  .filter((file) => file.includes("moonrakers_player_profile"))
  .filter((file) =>
    fs
      .readFileSync(path.join(migrationDir, file), "utf8")
      .includes("signedInTopPlayerOptions"),
  )
  .at(-1);

assert.ok(
  latestProfileMigration,
  "expected a Moonrakers player-profile migration to define signedInTopPlayerOptions",
);

const source = fs.readFileSync(
  path.join(migrationDir, latestProfileMigration),
  "utf8",
);

assert.match(
  source,
  /signedInTopPlayerOptions/i,
  "expected the latest player-profile migration to expose signedInTopPlayerOptions for the quick-player rail",
);

assert.match(
  source,
  /games_together/i,
  "expected the signed-in quick-player rail payload to be based on shared finished-game history",
);

console.log("player-profile-signed-in-priority-options.test.cjs passed");
