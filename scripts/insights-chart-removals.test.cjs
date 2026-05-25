const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

for (const relPath of ["app/insights.tsx", "components/InsightsScreen.tsx"]) {
  const source = read(relPath);

  assert.doesNotMatch(
    source,
    /<Text style=\{styles\.sectionTitle\}>Prestige Over Time<\/Text>[\s\S]*<PrestigeOverTimeChart/,
    `expected ${relPath} to stop rendering the Prestige Over Time chart directly`
  );

  assert.doesNotMatch(
    source,
    /<Text style=\{styles\.sectionTitle\}>Efficiency vs Failure<\/Text>[\s\S]*<EfficiencyFailureScatter/,
    `expected ${relPath} to stop rendering the Efficiency vs Failure chart directly`
  );
}

console.log("insights-chart-removals.test.cjs passed");
