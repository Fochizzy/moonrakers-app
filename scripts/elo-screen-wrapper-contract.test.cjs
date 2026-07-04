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
const sharedContractPath = path.join(
  __dirname,
  "..",
  "packages",
  "analytics-contract",
  "src",
  "getEloScreen.ts",
);

assert.equal(
  fs.existsSync(wrapperPath),
  true,
  "expected lib/cloud/analytics/getEloScreen.ts to exist",
);
assert.equal(
  fs.existsSync(sharedContractPath),
  true,
  "expected packages/analytics-contract/src/getEloScreen.ts to exist",
);

const source = fs.readFileSync(wrapperPath, "utf8");
const sharedContractSource = fs.readFileSync(sharedContractPath, "utf8");

assert.match(
  source,
  /from "@moonrakers\/analytics-contract"/,
  "expected the Expo wrapper to delegate to the shared analytics contract package",
);

assert.match(
  sharedContractSource,
  /"get_elo_screen"/,
  "expected the shared contract to call get_elo_screen",
);

assert.match(
  sharedContractSource,
  /profile_id:\s*(?:resolved\.)?params\.profileId/,
  "expected the shared contract to forward profile_id",
);

assert.match(
  sharedContractSource,
  /focus_player_id:\s*(?:resolved\.)?params\.focusPlayerId/,
  "expected the shared contract to forward focus_player_id",
);

assert.match(
  sharedContractSource,
  /opponent_id:\s*(?:resolved\.)?params\.opponentId/,
  "expected the shared contract to forward opponent_id",
);

assert.match(
  sharedContractSource,
  /sort_key:\s*(?:resolved\.)?params\.sortKey/,
  "expected the shared contract to forward sort_key",
);

console.log("elo-screen-wrapper-contract.test.cjs passed");
