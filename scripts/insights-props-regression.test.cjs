const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const screenSource = read(path.join("app", "insights.tsx"));
const correlationSource = read(path.join("components", "CorrelationStats.tsx"));

assert.match(
  screenSource,
  /<CorrelationStats[\s\S]*games=\{canonicalGames\}[\s\S]*players=\{players\}[\s\S]*relationships=\{relationships\}/,
  "expected app/insights.tsx to pass stable derived data into CorrelationStats"
);

assert.doesNotMatch(
  correlationSource,
  /\buseStore\s*\(/,
  "expected CorrelationStats to avoid direct Zustand subscriptions on the insights route"
);

assert.match(
  correlationSource,
  /type\s+CorrelationStatsProps\s*=\s*\{[\s\S]*games\?:[\s\S]*players\?:[\s\S]*relationships\?:/,
  "expected CorrelationStats to accept derived props for games, players, and relationships"
);

console.log("insights-props-regression.test.cjs passed");
