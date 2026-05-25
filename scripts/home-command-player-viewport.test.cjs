const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const screenSource = read(path.join("app", "index.tsx"));

const homeShellMatch = screenSource.match(/homeShellContent:\s*\{([\s\S]*?)\n\s*\},/);
assert.ok(homeShellMatch, "expected app/index.tsx to define homeShellContent styles");
assert.doesNotMatch(
  homeShellMatch[1],
  /paddingBottom:\s*4/,
  "expected app/index.tsx to stop overriding PageShell bottom padding with paddingBottom: 4",
);

const viewportMatch = screenSource.match(/commandPlayerViewport:\s*\{([\s\S]*?)\n\s*\},/);
assert.ok(viewportMatch, "expected app/index.tsx to define commandPlayerViewport styles");
assert.match(
  viewportMatch[1],
  /height:\s*198/,
  "expected app/index.tsx to cap the Command player viewport to an exact 4-card window before the inner list scrolls",
);

assert.match(
  screenSource,
  /<ScrollView[\s\S]*nestedScrollEnabled[\s\S]*contentContainerStyle=\{styles\.commandPlayerViewportContent\}/,
  "expected the Command player viewport ScrollView to enable nested scrolling so Android can scroll the player list inside the home screen",
);

console.log("home-command-player-viewport.test.cjs passed");
