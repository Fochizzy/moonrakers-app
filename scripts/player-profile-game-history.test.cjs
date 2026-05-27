const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "player-profile", "[playerId].tsx"),
  "utf8",
);
const migrationSource = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "supabase",
    "migrations",
    "20260525172608_moonrakers_profile_screen_rollup_achievements.sql",
  ),
  "utf8",
);

assert.doesNotMatch(
  source,
  /slice\(-6\)/,
  "expected the player profile game history list to stop truncating at six entries",
);

assert.match(
  source,
  /buildLocalPlayerProfileFallback/,
  "expected the player profile route to resolve recent games through the shared local fallback helper",
);

assert.match(
  source,
  /const recentGames = localProfileFallback\.recentGames;/,
  "expected the player profile game history list to read from the merged local fallback output",
);

assert.match(
  source,
  /\{selectedOpponentId \? "Filtered by opponent" : "Full history"\}/,
  "expected the player profile history section copy to reflect the full-history list",
);

assert.doesNotMatch(
  migrationSource,
  /recent_games := coalesce\(rollup_payload->'statsScreen'->'games'->'items','\[\]'::jsonb\);/,
  "expected the player profile recent games payload to stop reusing the capped stats-screen rollup items",
);

console.log("player-profile-game-history.test.cjs passed");
