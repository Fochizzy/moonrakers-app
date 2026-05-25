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
  /export function buildCloudPlayableCommandDirectory/,
  "expected registeredProfilePlayer.ts to expose a cloud-only command roster helper",
);

assert.match(
  homeSource,
  /buildCloudPlayableCommandDirectory/,
  "expected the home command screen to use the cloud-only roster helper",
);

assert.match(
  homeSource,
  /const commandDirectory = useMemo\(\s*\(\) => buildCloudPlayableCommandDirectory\(players, groups\)/,
  "expected app/index.tsx to build its command roster from cloud-playable players and groups only",
);

console.log("home-command-cloud-roster-wireup.test.cjs passed");
