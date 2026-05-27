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
  /<CorrelationStats[\s\S]*players=\{correlationPlayers\}[\s\S]*serverData=\{correlationPayload\}[\s\S]*serverOnly/,
  "expected app/insights.tsx to drive CorrelationStats from server-authored correlation payloads"
);

assert.doesNotMatch(
  screenSource,
  /<CorrelationStats[\s\S]*games=\{/,
  "expected app/insights.tsx to stop passing local game history into the server-only correlation surface"
);

assert.doesNotMatch(
  screenSource,
  /<CorrelationStats[\s\S]*relationships=\{/,
  "expected app/insights.tsx to stop passing locally-derived relationship maps into the server-only correlation surface"
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
