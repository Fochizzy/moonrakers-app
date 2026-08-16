const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(projectRoot, ...parts), "utf8");
}

const playerProfileSource = read("app", "player-profile", "[playerId].tsx");
const chartsSource = read("app", "charts", "index.tsx");
const insightsSource = read("app", "insights.tsx");

assert.match(
  playerProfileSource,
  /resolveSignedInPlayerOptionId/,
  "expected the player profile route to resolve the signed-in player against the live option list before rendering badges and labels",
);

assert.match(
  playerProfileSource,
  /String\(authProfile\?\.player_name \?\? ""\)\.trim\(\)\s*\|\|\s*String\(authProfile\?\.display_name \?\? ""\)\.trim\(\)/,
  "expected the player profile route to prefer the live auth player_name before any stale display_name when building the signed-in player label",
);

assert.match(
  chartsSource,
  /String\(authProfile\?\.player_name \?\? ""\)\.trim\(\)\s*\|\|\s*String\(authProfile\?\.display_name \?\? ""\)\.trim\(\)/,
  "expected the charts route to prefer the live auth player_name before any stale display_name when building signed-in quick-pick labels",
);

assert.match(
  insightsSource,
  /String\(authProfile\?\.player_name \?\? ""\)\.trim\(\)\s*\|\|\s*String\(authProfile\?\.display_name \?\? ""\)\.trim\(\)/,
  "expected the insights route to prefer the live auth player_name before any stale display_name when building signed-in player labels",
);

assert.match(
  playerProfileSource,
  /name:\s*authProfilePlayerOption\.name\s*\|\|\s*player\.name/,
  "expected the player profile quick-chip rail to override stale payload naming with the signed-in auth profile name",
);

assert.match(
  playerProfileSource,
  /name:\s*authProfilePlayerOption\.name\s*\|\|\s*nextPlayer\.name/,
  "expected the signed-in player profile header to override stale hero naming with the live auth profile name",
);

assert.match(
  chartsSource,
  /signedInFocusPlayerOptionId/,
  "expected the charts setup route to resolve the signed-in quick-pick option before rendering focus labels",
);

// The signed-in quick pick is labelled "You" rather than echoing a name that a
// stale payload could have gotten wrong, and only once the live auth profile
// confirms who that is. Insights labels its signed-in option the same way.
assert.match(
  chartsSource,
  /authProfilePlayer\?\.name\s*\?\s*\{\s*\.\.\.option,\s*label:\s*"You"\s*\}/,
  "expected the charts setup quick picks to label the signed-in option 'You' once the live auth profile resolves it",
);

assert.match(
  insightsSource,
  /resolveSignedInPlayerOptionId/,
  "expected the insights route to resolve the signed-in player against the option list before rendering player labels",
);

assert.match(
  insightsSource,
  /label:\s*"You",[\s\S]{0,200}authProfilePlayerOption\.displayName\s*\|\|\s*currentSignedInOption\.displayName/,
  "expected the insights route to label the signed-in option 'You' and back it with the live auth profile naming",
);

assert.match(
  insightsSource,
  /displayName:\s*authProfilePlayerOption\.displayName\s*\|\|\s*currentSignedInOption\.displayName/,
  "expected the insights route to override stale signed-in secondary naming with the live auth profile name",
);

console.log("signed-in-player-identity-overlay.test.cjs passed");
