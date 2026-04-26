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
  /<UtilityButton[\s\S]*label=\{setupOpen \? "Launch" : "Adjust"\}[\s\S]*onPress=\{\(\) =>[\s\S]*setupOpen \? openChart\(selectedChart\) : openSetup\(\)[\s\S]*\}[\s\S]*tone=\{setupOpen \? "green" : "blue"\}[\s\S]*subtitle=\{setupOpen \? "Open current chart" : undefined\}[\s\S]*size="compact"/,
  "expected the sticky setup CTA to switch into a launch action when setup is open"
);

assert.doesNotMatch(
  source,
  /<UtilityButton[\s\S]*label=\{setupOpen \? "Close" : "Adjust"\}[\s\S]*setupOpen \? setChartSetupOpen\(false\) : openSetup\(\)/,
  "expected the sticky setup CTA to stop acting like a close toggle during chart setup"
);

console.log("chart-setup-primary-cta.test.cjs passed");
