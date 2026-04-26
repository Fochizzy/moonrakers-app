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
  /style=\{styles\.setupBackButton\}[\s\S]*style=\{styles\.setupBackButtonText\}[\s\S]*Close setup/,
  "expected the Close setup back pill helper to render the dedicated back-pill styles and label"
);

assert.match(
  source,
  /<View style=\{styles\.setupFooterActions\}>[\s\S]*<SetupBackButton onPress=\{\(\) => setChartSetupOpen\(false\)\} \/>\s*<\/View>/,
  "expected the setup footer to render the Close setup back pill"
);

assert.doesNotMatch(
  source,
  /<View style=\{styles\.setupFooterActions\}>[\s\S]*label="Launch"[\s\S]*<\/View>/,
  "expected the setup footer to stop rendering the primary launch CTA"
);

console.log("chart-setup-back-pill.test.cjs passed");
