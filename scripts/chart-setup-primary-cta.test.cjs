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
  /<View style=\{styles\.heroActionRow\}>[\s\S]*\{setupOpen \? \([\s\S]*label="Open Chart"[\s\S]*onPress=\{\(\) => openChart\(selectedChart\)\}[\s\S]*tone="green"[\s\S]*size="compact"[\s\S]*<SetupBackButton onPress=\{\(\) => setChartSetupOpen\(false\)\} \/>[\s\S]*\) : \([\s\S]*label="Adjust"[\s\S]*onPress=\{\(\) => openSetup\(\)\}[\s\S]*tone="blue"[\s\S]*size="compact"[\s\S]*\)\}/s,
  "expected the hero action row to swap from Adjust into Open Chart plus Close Setup when setup is open, without a star action"
);

assert.doesNotMatch(
  source,
  /label=\{setupOpen \? "Close" : "Adjust"\}/,
  "expected the sticky setup CTA to stop using the old Close label toggle during chart setup"
);

assert.doesNotMatch(
  source,
  /function StarButton|styles\.starButton|styles\.starText|styles\.starTextActive|<StarButton/,
  "expected the chart header star affordance to be removed altogether"
);

console.log("chart-setup-primary-cta.test.cjs passed");
