const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const helperSource = read(path.join("lib", "cloud", "sharedGroups.ts"));
const screenSource = read(path.join("app", "add-players.tsx"));
const playerHelperSource = read(path.join("utils", "registeredProfilePlayer.ts"));

assert.match(
  playerHelperSource,
  /export function isLikelyRegisteredProfileId/,
  "expected registeredProfilePlayer.ts to export the registered-profile id helper for shared-group guards",
);

assert.match(
  helperSource,
  /\.from\("groups"\)\s*\.insert\(/s,
  "expected sharedGroups.ts to persist saved groups through Supabase",
);

assert.match(
  helperSource,
  /\.from\("group_members"\)\.insert\(/,
  "expected sharedGroups.ts to persist group members through Supabase",
);

assert.match(
  helperSource,
  /\.from\("groups"\)\.delete\(\)\.eq\("id", normalizedGroupId\)/,
  "expected sharedGroups.ts to delete shared groups through Supabase",
);

assert.match(
  screenSource,
  /await createVerifiedSharedGroup\(/,
  "expected add-players.tsx to create passcode-verified groups through the shared Supabase helper",
);

assert.match(
  screenSource,
  /await refreshCloudGroupState\(\)/,
  "expected add-players.tsx to reload the shared cloud snapshot after group changes",
);

assert.match(
  screenSource,
  /unregisteredSelectedPlayers\.length > 0/,
  "expected add-players.tsx to block non-account legacy players from being written into shared groups",
);

console.log("shared-groups-cloud-sync.test.cjs passed");
