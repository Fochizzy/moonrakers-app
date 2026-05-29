const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const catalogSource = fs.readFileSync(
  path.join(projectRoot, "utils", "definitionCatalog.ts"),
  "utf8",
);

for (const snippet of [
  'Score does not outrank total prestige in the final result',
  'It also has a lighter influence on ELO',
  "- Total Prestige: +1 score per prestige",
  "- Contract Success: +5 score per contract",
  "- Assist: +3 score per assist given",
  "- Failure: -4 score per failure",
  "- Head-to-Head Mission bonus: add any linked mission score bonus",
  "Each player starts at 1000",
  "expected win chance against the field",
  "current + 32 * (actual - expected)",
  "actual starts at 1 for a win, 0 for a loss, and 0.5 if no winner is recorded",
  "bonus-score adjustment based on score excluding raw prestige",
]) {
  assert.ok(
    catalogSource.includes(snippet),
    `expected definitionCatalog.ts to contain: ${snippet}`,
  );
}

console.log("definitions-score-elo-copy.test.cjs passed");
