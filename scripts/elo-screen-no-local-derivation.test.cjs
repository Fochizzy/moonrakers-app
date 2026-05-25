const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const homeSource = fs.readFileSync(
  path.join(projectRoot, "app", "index.tsx"),
  "utf8",
);
const eloSource = fs.readFileSync(
  path.join(projectRoot, "app", "elo.tsx"),
  "utf8",
);

assert.match(
  homeSource,
  /lib\/cloud\/analytics\/getEloScreen/,
  "expected app/index.tsx to import the server-authored getEloScreen wrapper",
);

assert.match(
  eloSource,
  /lib\/cloud\/analytics\/getEloScreen/,
  "expected app/elo.tsx to import the server-authored getEloScreen wrapper",
);

assert.doesNotMatch(
  homeSource,
  /calculateElo\s*\(/,
  "expected app/index.tsx to stop deriving Home leaderboard ELO locally",
);

assert.doesNotMatch(
  eloSource,
  /@\/utils\/elo/,
  "expected app/elo.tsx to stop importing local calculateElo helpers",
);

assert.doesNotMatch(
  eloSource,
  /calculateElo\s*\(/,
  "expected app/elo.tsx to stop deriving ELO screen data locally",
);

console.log("elo-screen-no-local-derivation.test.cjs passed");
