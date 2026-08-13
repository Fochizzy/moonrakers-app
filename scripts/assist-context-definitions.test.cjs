const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "utils", "definitionCatalog.ts"),
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
  // Threshold moved from >5 (unreachable) to >2 in 20260813170000/20260813180000.
  // The key keeps its historical name; the title states the real rule.
  'title: "Assists 3+ Behind Leader"',
  'key: "assistPrestigeGained"',
  'title: "Assist Prestige Gained"',
  'Legacy imports infer this from saved assist source totals',
]) {
  assert.ok(
    source.includes(snippet),
    `expected definitionCatalog.ts to contain ${snippet}`,
  );
}

console.log("assist-context-definitions.test.cjs passed");
