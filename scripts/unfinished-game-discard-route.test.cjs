const fs = require("node:fs");
const assert = require("node:assert/strict");
const path = require("node:path");

// Guards must resolve files relative to the repo, not this machine.
const projectRoot = path.resolve(__dirname, "..");

const home = fs.readFileSync(path.join(projectRoot, "app/index.tsx"), "utf8");

assert.match(home, /discardUnfinishedGame/);
assert.match(home, /isDiscardingUnfinishedGame/);
assert.match(
  home,
  /const confirmDeleteActiveGame = \(\) => \{\s*if \(isDiscardingUnfinishedGame\) \{\s*return;\s*\}/s,
);
assert.match(
  home,
  /const result = await discardUnfinishedGame\(\);[\s\S]*if \("message" in result\) \{\s*Alert\.alert\("Couldn't discard unfinished game", result\.message\);\s*\}/s,
);
assert.doesNotMatch(home, /onPress:\s*clearActiveGame/);
assert.match(
  home,
  /<ActionButton[\s\S]*title="Delete"[\s\S]*disabled=\{isDiscardingUnfinishedGame\}[\s\S]*\/>/s,
);

console.log("unfinished-game-discard-route.test.cjs passed");
