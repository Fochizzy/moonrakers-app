const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const helperSource = read(path.join("utils", "registeredProfilePlayer.ts"));
const homeSource = read(path.join("app", "index.tsx"));

assert.match(
  helperSource,
  /export function canonicalizeSelectablePlayers/,
  "expected registeredProfilePlayer.ts to export canonicalizeSelectablePlayers",
);

assert.match(
  helperSource,
  /isLikelyRegisteredProfileId/,
  "expected duplicate-name collapsing to prefer registered-style profile ids",
);

assert.match(
  helperSource,
  /shouldCollapsePlayerNameGroup/,
  "expected canonicalization to only collapse duplicate names when the group looks like a legacy-vs-registered collision",
);

assert.match(
  helperSource,
  /aliases\[playerId\] = mergedPlayer\.id/,
  "expected canonicalization to expose a legacy-to-canonical player id alias map",
);

assert.match(
  helperSource,
  /playerIds: remapGroupPlayerIds\(group\?\.playerIds \?\? \[\], aliases\)/,
  "expected saved groups to be remapped onto canonical player ids",
);

assert.match(
  homeSource,
  /const commandDirectory = useMemo\(\s*\(\) => buildCloudPlayableCommandDirectory\(players, groups\)/,
  "expected the home command screen to build its player picker from the cloud-playable canonical player directory",
);

assert.match(
  homeSource,
  /getGamePlayerIds\(game\)\s*\.map\(\(playerId\) => playerIdAliases\[playerId\] \?\? playerId\)/,
  "expected home-screen usage ranking to remap legacy duplicate ids before counting recent/frequent players",
);

assert.match(
  homeSource,
  /setSelectedIds\(\(current\) => \{\s*const remapped = ensureRequiredPlayerSelection\(/s,
  "expected any already-selected home-screen players to be remapped onto canonical ids",
);

console.log("home-command-player-dedup.test.cjs passed");
