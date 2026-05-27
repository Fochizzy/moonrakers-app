const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "index.tsx"),
  "utf8"
);
const heroBarSource = fs.readFileSync(
  path.join(projectRoot, "components", "charts", "ChartSetupHeroBar.tsx"),
  "utf8"
);

assert.match(
  source,
  /from "@\/utils\/appRoutes"/,
  "expected the charts hub to import the shared app route helpers for Command navigation"
);

assert.match(
  source,
  /<ChartSetupHeroBar[\s\S]*onBackToCommand=\{\(\) => router\.push\(APP_ROUTES\.home\)\}/,
  "expected the charts hub hero shell to wire the shared Command route into ChartSetupHeroBar"
);

assert.match(
  heroBarSource,
  /<ActionButton[\s\S]*title="Command"[\s\S]*onPress=\{onBackToCommand\}[\s\S]*\/>/,
  "expected ChartSetupHeroBar to render a Command action button"
);

console.log("chart-command-link.test.cjs passed");
