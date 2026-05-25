const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const homeSource = read(path.join("app", "index.tsx"));
const leaderboardTabSource = read(path.join("components", "home", "HomeLeaderboardTab.tsx"));

assert.match(
  homeSource,
  /lib\/cloud\/analytics\/getEloScreen/,
  "expected app/index.tsx to import the server-authored getEloScreen wrapper for the leaderboard tab",
);

assert.match(
  leaderboardTabSource,
  /fetchEloScreen/,
  "expected HomeLeaderboardTab to accept a fetchEloScreen prop for dependency injection",
);

assert.match(
  leaderboardTabSource,
  /fetchEloScreen\(\{/,
  "expected HomeLeaderboardTab to call the injected fetchEloScreen to load leaderboard data",
);

assert.match(
  homeSource,
  /fetchEloScreen=\{getEloScreen\}/,
  "expected the home screen to wire getEloScreen into HomeLeaderboardTab via the fetchEloScreen prop",
);

assert.doesNotMatch(
  homeSource,
  /calculateElo\s*\(/,
  "expected the home leaderboard to stop deriving ELO locally in favour of the server-authored source",
);

assert.doesNotMatch(
  leaderboardTabSource,
  /calculateElo\s*\(/,
  "expected HomeLeaderboardTab to stop deriving ELO locally in favour of the server-authored source",
);

console.log("home-leaderboard-canonicalization.test.cjs passed");
