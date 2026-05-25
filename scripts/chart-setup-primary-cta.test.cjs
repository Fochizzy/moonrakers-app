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
  /<ChartSetupHeroBar[\s\S]*setupOpen=\{setupOpen\}[\s\S]*onToggleSetup=\{/,
  "expected the charts route to hand setup entry and exit to the lightweight hero bar"
);

assert.doesNotMatch(
  source,
  /label="Open Chart"[\s\S]*heroActionRow/,
  "expected the hero to stop owning the primary Open Chart CTA"
);

assert.match(
  source,
  /<ChartSetupStageAction[\s\S]*title="Open Chart"/,
  "expected the final Style stage to own the primary Open Chart CTA"
);

console.log("chart-setup-primary-cta.test.cjs passed");
