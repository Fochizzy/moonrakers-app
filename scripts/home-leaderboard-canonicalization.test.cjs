const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const source = read(path.join("app", "index.tsx"));

assert.match(
  source,
  /function\s+HomeLeaderboardTab\(\{\s*players,\s*games,\s*playerIdAliases,/,
  "expected HomeLeaderboardTab to accept the canonical playerIdAliases map",
);

assert.match(
  source,
  /const\s+canonicalGames\s*=\s*useMemo\(/,
  "expected the leaderboard to derive a canonicalGames view before calculating ELO or rows",
);

assert.match(
  source,
  /calculateElo\(canonicalGames as any\)/,
  "expected leaderboard ELO to come from canonicalized game ids rather than raw game ids",
);

assert.match(
  source,
  /playerIdAliases\[normalizeId\(player\.id\)\]\s*\?\?\s*normalizeId\(player\.id\)/,
  "expected leaderboard player seeding to remap raw player ids through playerIdAliases",
);

assert.match(
  source,
  /\.filter\(\(player\)\s*=>\s*!!normalizeId\(player\.id\)\s*&&\s*player\.gamesPlayed\s*>\s*0\)/,
  "expected leaderboard rows to exclude players with zero games",
);

assert.match(
  source,
  /<HomeLeaderboardTab\s+players=\{players\}\s+games=\{games\}\s+playerIdAliases=\{playerIdAliases\}\s*\/>/,
  "expected the home screen to pass playerIdAliases into HomeLeaderboardTab",
);

console.log("home-leaderboard-canonicalization.test.cjs passed");
