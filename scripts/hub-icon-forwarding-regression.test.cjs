const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const homeHubsSource = read(path.join("app", "index.tsx"));
const playersHubSource = read(path.join("app", "players.tsx"));

assert.match(
  homeHubsSource,
  /iconKey=\{card\.iconKey \?\? null\}/,
  "expected the home hubs grid to keep forwarding card icon assets"
);

assert.doesNotMatch(
  homeHubsSource,
  /iconKey=\{\s*card\.key === "history"[\s\S]*\? null\s*:\s*card\.iconKey\s*\}/,
  "expected the home hubs grid to stop suppressing the history and definitions icon assets"
);

assert.match(
  playersHubSource,
  /iconKey=\{card\.iconKey \?\? null\}/,
  "expected the players hub index to keep forwarding card icon assets"
);

assert.doesNotMatch(
  playersHubSource,
  /iconKey=\{\s*card\.key === "cards"[\s\S]*\? card\.iconKey\s*:\s*null\s*\}/,
  "expected the players hub index to stop suppressing the roster and profiles icon assets"
);

console.log("hub-icon-forwarding-regression.test.cjs passed");
