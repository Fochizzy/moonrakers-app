const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const compareSource = read(path.join("app", "charts", "compare", "index.tsx"));
const gameSource = read(path.join("app", "game.tsx"));
const playerCardSource = read(path.join("components", "ColorPlayerCard.tsx"));

assert.match(
  compareSource,
  /import PageShell from ["']@\/components\/ui\/PageShell["']/,
  "expected compare to move onto the shared PageShell shell",
);

assert.match(
  compareSource,
  /import HeroCard from ["']@\/components\/ui\/HeroCard["']/,
  "expected compare to use the shared HeroCard shell",
);

assert.doesNotMatch(
  compareSource,
  /SafeAreaView/,
  "expected compare to stop using the route-local SafeAreaView wrapper",
);

assert.doesNotMatch(
  compareSource,
  /import ScreenBackground from ["']@\/components\/ui\/ScreenBackground["']/,
  "expected compare to stop wiring ScreenBackground directly once the shared shell owns the backdrop",
);

assert.match(
  gameSource,
  /import ScreenBackground from ["']@\/components\/ui\/ScreenBackground["']/,
  "expected the live game screen to adopt the shared ScreenBackground visual system",
);

assert.doesNotMatch(
  gameSource,
  /StarryNight/,
  "expected the live game screen to stop using the older StarryNight backdrop",
);

assert.match(
  playerCardSource,
  /import ScreenBackground from ["']@\/components\/ui\/ScreenBackground["']/,
  "expected the standalone player-card screen to adopt the shared ScreenBackground visual system",
);

assert.doesNotMatch(
  playerCardSource,
  /StarryNight/,
  "expected the standalone player-card screen to stop using the older StarryNight backdrop",
);

console.log("visual-system-outliers.test.cjs passed");
