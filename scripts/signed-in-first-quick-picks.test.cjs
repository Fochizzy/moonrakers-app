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

assert.match(
  chartsSource,
  /prioritizeSignedInPlayerOptions\(\{[\s\S]*players:\s*scopePlayerDirectoryPlayers[\s\S]*authProfileId:\s*authProfile\?\.id[\s\S]*authSessionUserId:\s*authSession\?\.user\?\.id[\s\S]*commonPlayerLimit:\s*4[\s\S]*\}\)/,
  "expected the charts setup route to order scope quick picks with the shared signed-in-first helper",
);

assert.match(
  insightsSource,
  /prioritizeSignedInPlayerOptions\(\{[\s\S]*authSessionUserId:\s*authSession\?\.user\?\.id[\s\S]*commonPlayerLimit:\s*4[\s\S]*\}\)/,
  "expected the insights route to order personal-correlation player picks with the shared signed-in-first helper",
);

assert.match(
  compareSource,
  /prioritizeSignedInPlayerOptions\(\{[\s\S]*authProfileId[\s\S]*authSessionUserId[\s\S]*commonPlayerLimit:\s*4[\s\S]*\}\)/,
  "expected the compare route to order conditional quick picks with the shared signed-in-first helper",
);

console.log("signed-in-first-quick-picks.test.cjs passed");
