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
  /function openCommandPage\(\)\s*\{[\s\S]*router\.push\(buildHomeRoute\(\)\);[\s\S]*\}/,
  "expected the chart detail screen to define a Command-page navigation helper"
);

assert.match(
  source,
  /function openChartsPage\(\)\s*\{[\s\S]*buildChartsRoute\(\{[\s\S]*playerId:\s*routePlayerId\s*\?\?\s*null[\s\S]*compareId:\s*routeCompareId\s*\?\?\s*null[\s\S]*ids:\s*routeIds[\s\S]*\}\)[\s\S]*\}/,
  "expected the chart detail screen to define a Charts-page navigation helper"
);

assert.match(
  source,
  /<View style=\{styles\.heroActionRow\}>[\s\S]*Back to Adjust[\s\S]*Back to Charts[\s\S]*Command[\s\S]*<\/View>/,
  "expected the chart detail hero actions to place Back to Charts between Back to Adjust and Command"
);

assert.match(
  source,
  /<TouchableOpacity[\s\S]*style=\{styles\.secondaryButton\}[\s\S]*onPress=\{openChartsPage\}[\s\S]*Back to Charts/,
  "expected the Back to Charts button to use the Charts-page navigation helper"
);

assert.match(
  source,
  /<TouchableOpacity[\s\S]*style=\{styles\.secondaryButton\}[\s\S]*onPress=\{openCommandPage\}[\s\S]*Command/,
  "expected the Command button to use the Command-page navigation helper"
);

console.log("chart-detail-command-link.test.cjs passed");
