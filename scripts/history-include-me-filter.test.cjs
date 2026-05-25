const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "history.tsx"),
  "utf8"
);

assert.match(
  source,
  /type HistoryFilter = 'all' \| 'group' \| 'mine';/,
  "expected history filter state to expose a dedicated 'mine' mode"
);

assert.match(
  source,
  /const authSession = useAuthSession\(\);/,
  "expected history to read auth session from the shared store"
);
assert.match(
  source,
  /const authProfile = useAuthProfile\(\);/,
  "expected history to read auth profile from the shared store"
);

assert.match(
  source,
  /function resolveHistoryPlayerId\(/,
  "expected history to resolve the signed-in player id before filtering"
);

assert.match(
  source,
  /historyFilter === 'mine' && !gameIncludesPlayer\(game, signedInPlayerId\)/,
  "expected the displayed history list to exclude games that do not include the signed-in player when the mine filter is active"
);

console.log("history-include-me-filter.test.cjs passed");
