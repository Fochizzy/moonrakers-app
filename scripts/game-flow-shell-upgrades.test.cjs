const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

function expectSharedShell(routePath, options = {}) {
  const source = read(routePath);

  assert.match(
    source,
    /import PageShell from ["']@\/components\/ui\/PageShell["']/,
    `expected ${routePath} to use the shared PageShell shell`,
  );

  if (options.hero !== false) {
    assert.match(
      source,
      /import HeroCard from ["']@\/components\/ui\/HeroCard["']/,
      `expected ${routePath} to use the shared HeroCard shell`,
    );
  }

  if (options.section !== false) {
    assert.match(
      source,
      /import SectionCard from ["']@\/components\/ui\/SectionCard["']/,
      `expected ${routePath} to use the shared SectionCard shell`,
    );
  }

  assert.doesNotMatch(
    source,
    /StarryNight/,
    `expected ${routePath} to stop using the older StarryNight backdrop`,
  );
}

expectSharedShell(path.join("app", "add-players.tsx"));
expectSharedShell(path.join("app", "player-cards.tsx"));
expectSharedShell(path.join("app", "summary.tsx"));
expectSharedShell(path.join("app", "player-profile", "[playerId].tsx"), {
  hero: false,
  section: false,
});

console.log("game-flow-shell-upgrades.test.cjs passed");
