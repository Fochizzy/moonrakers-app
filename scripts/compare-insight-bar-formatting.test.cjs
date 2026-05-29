const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const compareInsightSource = read(
  path.join("components", "charts", "compare", "CompareInsightBar.tsx"),
);
const compareStylesSource = read(path.join("utils", "compareStyles.ts"));

assert.doesNotMatch(
  compareInsightSource,
  /Based on this selection:/,
  "expected the compare insight card to drop the repeated selection sentence and rely on clearer visual hierarchy instead",
);

assert.match(
  compareInsightSource,
  /<View style={styles\.selectionContextCard}>[\s\S]*<Text style={styles\.selectionContextLabel}>Selection<\/Text>[\s\S]*<Text style={styles\.selectionContextValue}>{comparedLabel}<\/Text>[\s\S]*<\/View>/,
  "expected the compare insight card to render the active selection as a compact context block",
);

assert.match(
  compareInsightSource,
  /<View style={styles\.insightLineList}>[\s\S]*<View key={line} style={styles\.insightLineCard}>[\s\S]*style={styles\.insightLineText}[\s\S]*<\/View>[\s\S]*<\/View>/,
  "expected compare insight paragraphs to render inside separated line cards for better readability",
);

assert.match(
  compareStylesSource,
  /selectionContextCard:/,
  "expected shared compare styles to define the new selection context card",
);

assert.match(
  compareStylesSource,
  /insightLineCard:/,
  "expected shared compare styles to define the new insight line card styling",
);

console.log("compare-insight-bar-formatting.test.cjs passed");
