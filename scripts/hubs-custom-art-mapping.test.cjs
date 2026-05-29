const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const iconAccessSource = read(path.join("utils", "iconAccess.ts"));
const appHubsSource = read(path.join("utils", "appHubs.ts"));

assert.match(
  iconAccessSource,
  /hazardDieHub:\s*require\("\.\.\/assets\/icons\/Hazard_Die\.png"\)/,
  "expected the hubs icon map to expose Hazard_Die.png for the hubs artwork set"
);

assert.match(
  iconAccessSource,
  /missionHub:\s*require\("\.\.\/assets\/icons\/Mission\.png"\)/,
  "expected the hubs icon map to expose Mission.png for the hubs artwork set"
);

assert.match(
  iconAccessSource,
  /moneyHub:\s*require\("\.\.\/assets\/icons\/Money\.png"\)/,
  "expected the hubs icon map to expose Money.png for the hubs artwork set"
);

assert.match(
  iconAccessSource,
  /objectiveHub:\s*require\("\.\.\/assets\/icons\/Objective\.png"\)/,
  "expected the hubs icon map to expose Objective.png for the hubs artwork set"
);

assert.match(
  iconAccessSource,
  /prestigeHub:\s*require\("\.\.\/assets\/icons\/Prestige\.png"\)/,
  "expected the hubs icon map to expose Prestige.png for the hubs artwork set"
);

assert.match(
  appHubsSource,
  /key:\s*"history"[\s\S]*?iconKey:\s*"miss"/,
  "expected the history bridge tile to use miss art"
);

assert.match(
  appHubsSource,
  /key:\s*"analytics"[\s\S]*?iconKey:\s*"shield"/,
  "expected the analytics bridge tile to use shield art"
);

assert.match(
  appHubsSource,
  /key:\s*"players"[\s\S]*?iconKey:\s*"orangePerson"/,
  "expected the players bridge tile to use orangePerson art"
);

assert.match(
  appHubsSource,
  /key:\s*"definitions"[\s\S]*?iconKey:\s*"thruster"/,
  "expected the definitions bridge tile to use thruster art"
);

assert.match(
  appHubsSource,
  /key:\s*"manage-user-groups"[\s\S]*?title:\s*"Manage User\/Groups"[\s\S]*?route:\s*APP_ROUTES\.roster[\s\S]*?iconKey:\s*"missionHub"[\s\S]*?layout:\s*"graphic-horizontal"[\s\S]*?fullWidth:\s*true/,
  "expected the manage user/groups bridge tile to use Mission art and the wide horizontal hub layout"
);

const bridgeBlock = appHubsSource.match(
  /const BRIDGE_DESTINATIONS: HubCard\[] = \[([\s\S]*?)\];/
);

assert.ok(bridgeBlock, "expected the hubs source to define BRIDGE_DESTINATIONS");

const bridgeIconKeys = [...bridgeBlock[1].matchAll(/iconKey:\s*"([^"]+)"/g)].map(
  (match) => match[1]
);

assert.equal(
  bridgeIconKeys.length,
  5,
  "expected five bridge destination icon assignments"
);

assert.equal(
  new Set(bridgeIconKeys).size,
  bridgeIconKeys.length,
  "expected each bridge destination to use a different artwork key"
);

assert.match(
  appHubsSource,
  /key:\s*"insights"[\s\S]*?iconKey:\s*"hazardDieHub"/,
  "expected the insights hub tile to use Hazard Die art so the new hubs asset set is fully represented"
);

console.log("hubs-custom-art-mapping.test.cjs passed");
