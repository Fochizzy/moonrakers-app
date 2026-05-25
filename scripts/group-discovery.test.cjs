const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const helperSource = read(path.join("utils", "groupUsageRanking.ts"));
const homeSource = read(path.join("app", "index.tsx"));
const addPlayersSource = read(path.join("app", "add-players.tsx"));

assert.match(
  helperSource,
  /export\s+function\s+rankGroupsWithUsage(?:<[\s\S]*?>)?\s*\(/,
  "expected utils/groupUsageRanking.ts to export rankGroupsWithUsage("
);

assert.match(
  helperSource,
  /export\s+function\s+filterGroupsByQuery(?:<[\s\S]*?>)?\s*\(/,
  "expected utils/groupUsageRanking.ts to export filterGroupsByQuery("
);

assert.match(
  helperSource,
  /export\s+function\s+formatGroupUsageHint\s*\(/,
  "expected utils/groupUsageRanking.ts to export formatGroupUsageHint("
);

assert.match(
  homeSource,
  /rankGroupsWithUsage\s*\(/,
  "expected app/index.tsx to use rankGroupsWithUsage("
);

assert.match(
  addPlayersSource,
  /const\s+\[\s*groupSearchQuery\s*,\s*setGroupSearchQuery\s*\]\s*=\s*useState/,
  "expected app/add-players.tsx to define groupSearchQuery state"
);

assert.match(
  addPlayersSource,
  /const\s+\[\s*groupSortMode\s*,\s*setGroupSortMode\s*\]\s*=\s*useState<[^>]*>\s*\(\s*\"most-played\"\s*\)/,
  "expected app/add-players.tsx to define groupSortMode state defaulting to \"most-played\""
);

assert.match(
  addPlayersSource,
  /placeholder=\"Search groups\"/,
  "expected app/add-players.tsx to render placeholder=\"Search groups\""
);

assert.match(
  addPlayersSource,
  /Most Played/,
  "expected app/add-players.tsx to render a Most Played sort chip"
);

assert.match(
  addPlayersSource,
  /Recent/,
  "expected app/add-players.tsx to render a Recent sort chip"
);

assert.match(
  addPlayersSource,
  /A-Z/,
  "expected app/add-players.tsx to render an A-Z sort chip"
);

assert.match(
  addPlayersSource,
  /formatGroupUsageHint\s*\(/,
  "expected app/add-players.tsx to use formatGroupUsageHint("
);

console.log("group-discovery.test.cjs passed");
