const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const helperSource = read(path.join("lib", "cloud", "loadHydratedCloudState.ts"));
const bootstrapSource = read(path.join("lib", "auth", "bootstrapSharedCloudState.ts"));

assert.match(
  helperSource,
  /export async function loadHydratedCloudState\(session:/,
  "expected a shared cloud rehydration helper to be exported from lib/cloud/loadHydratedCloudState.ts",
);

assert.match(
  helperSource,
  /loadCloudSnapshot\(profileId\)/,
  "expected the helper to load the shared cloud snapshot",
);

assert.match(
  helperSource,
  /loadRegisteredProfiles\(\)\.catch\([\s\S]{0,120}=> \[\],?\s*\)/,
  "expected the helper to merge registered profiles defensively",
);

assert.match(
  helperSource,
  /loadStatsSnapshot\(\{\s*profileId,\s*groups:\s*snapshot\.groups,\s*games:\s*snapshot\.games,\s*\}\)/,
  "expected the helper to rebuild the stats snapshot from the refreshed shared snapshot",
);

assert.match(
  helperSource,
  /players:\s*mergeRegisteredProfilesIntoPlayers\(snapshot\.players,\s*registeredProfiles\)/,
  "expected the helper to merge registered profiles into snapshot.players",
);

assert.match(
  bootstrapSource,
  /return loadHydratedCloudState\(session\);/,
  "expected bootstrapSharedCloudState to delegate shared hydration to the new helper",
);

console.log("shared-cloud-rehydration-helper.test.cjs passed");
