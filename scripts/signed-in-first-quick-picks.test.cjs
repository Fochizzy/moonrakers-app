const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(projectRoot, ...parts), "utf8");
}

const chartsSource = read("app", "charts", "index.tsx");
const insightsSource = read("app", "insights.tsx");
const compareSource = read("app", "charts", "compare", "index.tsx");

assert.match(
  chartsSource,
  /prioritizeSignedInPlayerOptions\(\{[\s\S]*players:\s*focusPlayerDirectoryPlayers[\s\S]*authProfileId:\s*authProfile\?\.id[\s\S]*authSessionUserId:\s*authSession\?\.user\?\.id[\s\S]*commonPlayerLimit:\s*4[\s\S]*\}\)/,
  "expected the charts setup route to order focus quick picks with the shared signed-in-first helper",
);

// The scope rail carries an extra explicit pick, so it shows fewer common
// players than the focus rail. The count is a layout choice; what matters here
// is that the shared signed-in-first helper still orders the rail.
assert.match(
  chartsSource,
  /prioritizeSignedInPlayerOptions\(\{[\s\S]*players:\s*scopePlayerDirectoryPlayers[\s\S]*authProfileId:\s*authProfile\?\.id[\s\S]*authSessionUserId:\s*authSession\?\.user\?\.id[\s\S]*commonPlayerLimit:\s*\d+[\s\S]*\}\)/,
  "expected the charts setup route to order scope quick picks with the shared signed-in-first helper",
);

// Insights has no "common players" rail to cap, so it resolves the signed-in
// option and sorts it to the front directly rather than going through
// prioritizeSignedInPlayerOptions.
assert.match(
  insightsSource,
  /resolveSignedInPlayerOptionId\(\{[\s\S]{0,400}authSessionUserId:\s*authSession\?\.user\?\.id/,
  "expected the insights route to resolve the signed-in player against the live option list",
);

assert.match(
  insightsSource,
  /const leftSignedIn = signedInPlayerOptionId && left\.id === signedInPlayerOptionId \? 0 : 1;/,
  "expected the insights route to sort the signed-in player to the front of the personal-correlation picks",
);

assert.match(
  compareSource,
  /prioritizeSignedInPlayerOptions\(\{[\s\S]*authProfileId[\s\S]*authSessionUserId[\s\S]*commonPlayerLimit:\s*4[\s\S]*\}\)/,
  "expected the compare route to order conditional quick picks with the shared signed-in-first helper",
);

console.log("signed-in-first-quick-picks.test.cjs passed");
