const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

const routeSource = fs.readFileSync(
  path.join(projectRoot, "app", "player-cards.tsx"),
  "utf8",
);
const componentSource = fs.readFileSync(
  path.join(projectRoot, "components", "ColorPlayerCard.tsx"),
  "utf8",
);

assert.match(
  routeSource,
  /playerCardElo/,
  "expected player-cards route to depend on a shared player-card ELO helper",
);

assert.match(
  componentSource,
  /playerCardElo/,
  "expected ColorPlayerCard to depend on the shared player-card ELO helper",
);

assert.doesNotMatch(
  routeSource,
  /calculateElo\(/,
  "expected player-cards route to stop calling calculateElo directly",
);

assert.doesNotMatch(
  componentSource,
  /calculateElo\(/,
  "expected ColorPlayerCard to stop calling calculateElo directly",
);

assert.doesNotMatch(
  routeSource,
  /@\/utils\/elo/,
  "expected player-cards route to stop importing the old ELO helper directly",
);

assert.doesNotMatch(
  componentSource,
  /@\/utils\/elo/,
  "expected ColorPlayerCard to stop importing the old ELO helper directly",
);

console.log("player-card-elo-helper.test.cjs passed");
