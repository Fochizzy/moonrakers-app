const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { readGameScreenSource } = require("./support/game-screen-source.cjs");

const source = readGameScreenSource();

assert.match(
  source,
  /<Text style=\{styles\.sectionTitle\}>Objectives<\/Text>/,
  "expected the Objectives section header to show only the label without the awarded counter copy",
);

assert.doesNotMatch(
  source,
  /Objectives \{totalAwarded\} awarded/,
  "expected the awarded counter text to be removed from the Objectives section header",
);

assert.match(
  source,
  /const animatedHeight = progress\.interpolate\(\{\s*inputRange: \[0, 1\],\s*outputRange: \[0, 52\],\s*\}\);/s,
  "expected assist rows to use a slightly shorter animated height so stacked players sit closer together",
);

assert.match(
  source,
  /const animatedMarginBottom = progress\.interpolate\(\{\s*inputRange: \[0, 1\],\s*outputRange: \[0, 2\],\s*\}\);/s,
  "expected assist rows to trim the bottom spacing between players",
);

console.log("game-score-controls-compactness.test.cjs passed");
