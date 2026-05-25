const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "[chartKey].tsx"),
  "utf8"
);

assert.match(
  source,
  /function openCommandPage\(\)\s*\{[\s\S]*router\.push\(APP_ROUTES\.home\);[\s\S]*\}/,
  "expected the chart detail screen to define a Command-page navigation helper"
);

assert.match(
  source,
  /<View style=\{styles\.heroActionRow\}>[\s\S]*Back to Adjust[\s\S]*Back to Command[\s\S]*<\/View>/,
  "expected the chart detail hero actions to show Back to Command beside Back to Adjust"
);

assert.match(
  source,
  /<TouchableOpacity[\s\S]*style=\{styles\.secondaryButton\}[\s\S]*onPress=\{openCommandPage\}[\s\S]*Back to Command/,
  "expected the Back to Command button to use the Command-page navigation helper"
);

console.log("chart-detail-command-link.test.cjs passed");
