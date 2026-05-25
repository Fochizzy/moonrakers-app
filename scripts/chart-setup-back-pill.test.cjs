const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const routeSource = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "index.tsx"),
  "utf8"
);
const heroSource = fs.readFileSync(
  path.join(projectRoot, "components", "charts", "ChartSetupHeroBar.tsx"),
  "utf8"
);

assert.match(
  heroSource,
  /title=\{setupOpen \? "Close Setup" : "Edit Setup"\}/,
  "expected the setup toggle action to read Edit Setup on browse mode and Close Setup while the rail is open"
);

assert.doesNotMatch(
  routeSource,
  /<View style=\{styles\.setupFooterActions\}>[\s\S]*(Open Chart|Close Setup)[\s\S]*<\/View>/,
  "expected the retired setup footer action strip to stay empty once the guided rail owns the CTA hierarchy"
);

console.log("chart-setup-back-pill.test.cjs passed");
