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

// Local game rows are still allowed as a whole-record fallback for players the
// server has not ranked. What is banned is mixing the two sources inside one
// row, which used to clamp a 12-4 record to 12W / 0L.
assert.match(
  source,
  /const hasServerRecord =\s*typeof serverRow\?\.wins === "number" &&\s*typeof serverRow\?\.losses === "number";/,
  "expected the ELO leaderboard to decide server-vs-local record per row instead of blending them",
);

assert.match(
  source,
  /const wins = hasServerRecord \? \(serverRow!\.wins as number\) : localWins;/,
  "expected wins to come from one source or the other, never a mix",
);

assert.doesNotMatch(
  source,
  /gamesPlayed:\s*toNumber\(cloudRow\?\.gamesPlayed\)\s*\|\|\s*\(gameRows\[playerId\]\?\.length \?\? 0\)/,
  "expected the ELO leaderboard rows to stop filling games-played counts from local game rows",
);

console.log("elo-screen-server-only-sections.test.cjs passed");
