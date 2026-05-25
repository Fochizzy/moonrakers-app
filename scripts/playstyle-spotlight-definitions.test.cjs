const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const statsSource = read(path.join("app", "stats.tsx"));
const intelSource = read(
  path.join("components", "player", "MoonrakersIntelSection.tsx"),
);

assert.match(
  statsSource,
  /Playstyle Spotlight|Stay-at-Base Spotlight/,
  "expected stats playstyle tab to promote playstyle into a spotlight treatment",
);

assert.match(
  statsSource,
  /DefinitionsJumpLink[\s\S]*metric="playstyle"|DefinitionsJumpLink[\s\S]*category="efficiency"/,
  "expected stats playstyle spotlight to include stronger glossary access",
);

for (const metricKey of [
  "baseTurnsPerGame",
  "baseRate",
  "styleRead",
  "supportStyle",
  "bestCondition",
  "worstCondition",
]) {
  assert.match(
    intelSource,
    new RegExp(metricKey),
    `expected MoonrakersIntelSection to wire a definitions jump for ${metricKey}`,
  );
}

console.log("playstyle-spotlight-definitions.test.cjs passed");
