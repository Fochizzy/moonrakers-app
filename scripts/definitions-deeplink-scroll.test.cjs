const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const definitionsSource = fs.readFileSync(
  path.join(projectRoot, "app", "definitions.tsx"),
  "utf8",
);

assert.match(
  definitionsSource,
  /<PageShell[\s\S]*scroll=\{false\}/,
  "expected Definitions to disable the generic PageShell scroller so it can own deep-link scrolling",
);

assert.match(
  definitionsSource,
  /const scrollViewRef = useRef<ScrollView \| null>\(null\);/,
  "expected Definitions to hold a dedicated ScrollView ref for deep-link jumps",
);

assert.match(
  definitionsSource,
  /const itemOffsets = useRef<Record<string, number>>\(\{\}\);/,
  "expected Definitions to track per-term layout offsets for metric deep links",
);

assert.match(
  definitionsSource,
  /itemOffsets\.current\[item\.key\] = event\.nativeEvent\.layout\.y;/,
  "expected Definitions to record each definition card layout for later scrolling",
);

assert.match(
  definitionsSource,
  /scrollViewRef\.current\?\.scrollTo\(\{\s*y:\s*Math\.max\(0,\s*targetY\s*-\s*\d+\),\s*animated:\s*true,\s*\}\);/s,
  "expected Definitions to scroll the requested term into view when opened from a deep link",
);

assert.match(
  definitionsSource,
  /const highlight = item\.key === targetMetric;/,
  "expected Definitions to keep highlighting the active metric card",
);

console.log("definitions-deeplink-scroll.test.cjs passed");
