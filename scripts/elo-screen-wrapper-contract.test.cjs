const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const wrapperPath = path.join(
  __dirname,
  "..",
  "lib",
  "cloud",
  "analytics",
  "getEloScreen.ts",
);

assert.equal(
  fs.existsSync(wrapperPath),
  true,
  "expected lib/cloud/analytics/getEloScreen.ts to exist",
);

const source = fs.readFileSync(wrapperPath, "utf8");

assert.match(
  source,
  /"get_elo_screen"/,
  "expected the wrapper to call get_elo_screen",
);

assert.match(
  source,
  /profile_id:\s*params\.profileId/,
  "expected the wrapper to forward profile_id",
);

assert.match(
  source,
  /focus_player_id:\s*params\.focusPlayerId/,
  "expected the wrapper to forward focus_player_id",
);

assert.match(
  source,
  /opponent_id:\s*params\.opponentId/,
  "expected the wrapper to forward opponent_id",
);

assert.match(
  source,
  /sort_key:\s*params\.sortKey/,
  "expected the wrapper to forward sort_key",
);

console.log("elo-screen-wrapper-contract.test.cjs passed");
