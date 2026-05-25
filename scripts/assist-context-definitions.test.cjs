const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "definitions.tsx"),
  "utf8",
);

for (const snippet of [
  'key: "support"',
  'title: "Assist Context"',
  'key: "assistGapToTarget"',
  'title: "Assist Gap to Target"',
  'key: "assistGapToLeader"',
  'title: "Assist Gap to Leader"',
  'key: "assistsAtSixPlus"',
  'title: "Assists at 6+ Prestige"',
  'key: "assistsOverFiveBehindLeader"',
  'title: "Assists Over 5 Behind Leader"',
  'key: "assistPrestigeGained"',
  'title: "Assist Prestige Gained"',
  'Legacy imports infer this from saved assist source totals',
]) {
  assert.ok(
    source.includes(snippet),
    `expected definitions.tsx to contain ${snippet}`,
  );
}

console.log("assist-context-definitions.test.cjs passed");
