const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(projectRoot, ...parts), "utf8");
}

const compareRouteSource = read("app", "charts", "compare", "index.tsx");
const conditionalCardSource = read(
  "components",
  "charts",
  "compare",
  "ConditionalComparisonCard.tsx"
);
const conditionalHelperSource = read("utils", "conditionalCompareHelpers.ts");

assert.match(
  conditionalCardSource,
  /onRunCompare:\s*\(\)\s*=>\s*void;/,
  "expected the conditional comparison card props to expose an explicit Compare action"
);

assert.match(
  conditionalCardSource,
  /<Text style=\{styles\.compareButtonText\}>Compare<\/Text>/,
  "expected the conditional builder to render a dedicated Compare button"
);

assert.doesNotMatch(
  conditionalCardSource,
  /Top Wins|onApplyTopWins/,
  "expected the dead Top Wins conditional action to stay removed"
);

assert.match(
  conditionalCardSource,
  /const shouldShowConditionalDetails = conditionalState\.hasRunCompare && hasSentenceSelection && sampleSize > 0;/,
  "expected conditional results to stay gated behind hasRunCompare"
);

assert.match(
  conditionalHelperSource,
  /hasRunCompare:\s*boolean;/,
  "expected the conditional reducer state to track whether Compare has been run"
);

assert.match(
  conditionalHelperSource,
  /hasRunCompare:\s*false,/,
  "expected conditional state resets to clear hasRunCompare by default"
);

assert.match(
  conditionalHelperSource,
  /case 'run-compare':[\s\S]*hasRunCompare:\s*true[\s\S]*selectorCollapsed:\s*true/,
  "expected running conditional Compare to both set hasRunCompare and collapse the builder"
);

assert.match(
  compareRouteSource,
  /if \(!conditionalState\.hasRunCompare \|\| !hasConditionalSelection\) \{\s*return null;\s*\}/,
  "expected the compare route to avoid building conditional results until Compare is clicked"
);

assert.match(
  compareRouteSource,
  /dispatchConditional\(\{ type: "run-compare" \}\);/,
  "expected the compare route to dispatch the explicit run-compare action"
);

assert.match(
  compareRouteSource,
  /const \[compareSetupCollapsed, setCompareSetupCollapsed\] = useState\(false\);/,
  "expected the compare route to track analyzed collapse state for the regular compare builder"
);

assert.match(
  compareRouteSource,
  /const \[hasRunCohesionAnalyze, setHasRunCohesionAnalyze\] = useState\(false\);/,
  "expected the compare route to track whether cohesion Analyze has been pressed"
);

assert.match(
  compareRouteSource,
  /const hasAnalyzed = hasRunCohesionAnalyze && hasSelection && rows.length > 0;/,
  "expected cohesion results to stay hidden until Analyze has explicitly run"
);

assert.match(
  compareRouteSource,
  /setHasRunCohesionAnalyze\(false\);[\s\S]*setSelectedPlayerIds\(\(prev\) => \{/,
  "expected player selection changes to clear the prior cohesion analysis"
);

assert.match(
  compareRouteSource,
  /setHasRunCohesionAnalyze\(false\);[\s\S]*setSelectedGroupIds\(\(prev\) => \{/,
  "expected group selection changes to clear the prior cohesion analysis"
);

assert.match(
  compareRouteSource,
  /function handleAnalyzeSelection\(\) \{[\s\S]*setHasRunCohesionAnalyze\(true\);[\s\S]*setCompareSetupCollapsed\(true\);[\s\S]*\}/,
  "expected Analyze to explicitly unlock cohesion results before collapsing the setup card"
);

assert.match(
  compareRouteSource,
  /<Text style=\{styles\.summaryActionText\}>Edit lineup<\/Text>/,
  "expected the analyzed compare summary to keep an explicit Edit lineup path"
);

assert.match(
  compareRouteSource,
  /onAnalyze=\{handleAnalyzeSelection\}/,
  "expected the Analyze button to be wired to the compare route collapse handler"
);

assert.doesNotMatch(
  compareRouteSource,
  /onAnalyze=\{\(\) => \{\}\}/,
  "expected the Analyze button wiring to stop being a no-op"
);

console.log("compare-route-density.test.cjs passed");
