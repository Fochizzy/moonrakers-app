const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "elo.tsx"),
  "utf8",
);

assert.doesNotMatch(
  source,
  /resolveEloSectionPayload|resolveEloInsightPayload/,
  "expected the ELO route to stop rebuilding section cards and insight copy locally once the Supabase contract returns them directly",
);

assert.doesNotMatch(
  source,
  /buildGameRowsByPlayer/,
  "expected the ELO route to stop using local game history to fill leaderboard analytics gaps",
);

assert.doesNotMatch(
  source,
  /gamesPlayed:\s*toNumber\(cloudRow\?\.gamesPlayed\)\s*\|\|\s*\(gameRows\[playerId\]\?\.length \?\? 0\)/,
  "expected the ELO leaderboard rows to stop filling games-played counts from local game rows",
);

console.log("elo-screen-server-only-sections.test.cjs passed");
