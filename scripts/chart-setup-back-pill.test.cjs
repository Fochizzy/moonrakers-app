const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "index.tsx"),
  "utf8"
);

assert.match(
  source,
  /function SetupBackButton\(\{ onPress \}: \{ onPress: \(\) => void; \}\)/,
  "expected chart setup to define a dedicated Close setup back pill helper"
);

assert.match(
  source,
  /style=\{styles\.setupBackButton\}[\s\S]*style=\{styles\.setupBackButtonText\}[\s\S]*Close Setup/,
  "expected the Close Setup back pill helper to render the dedicated back-pill styles and exact label"
);

assert.match(
  source,
  /<View style=\{styles\.heroActionRow\}>[\s\S]*<SetupBackButton onPress=\{\(\) => setChartSetupOpen\(false\)\} \/>\s*[\s\S]*<\/View>/,
  "expected the hero action row to render the Close Setup back pill while chart setup is open"
);

assert.doesNotMatch(
  source,
  /<View style=\{styles\.setupFooterActions\}>[\s\S]*(Open Chart|Close Setup|SetupBackButton)[\s\S]*<\/View>/,
  "expected the setup footer to stop rendering the Open Chart and Close Setup actions"
);

console.log("chart-setup-back-pill.test.cjs passed");
