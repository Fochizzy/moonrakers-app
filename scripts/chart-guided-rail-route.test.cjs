const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "index.tsx"),
  "utf8",
);

assert.match(
  source,
  /import ChartSetupHeroBar from "@\/components\/charts\/ChartSetupHeroBar";/,
  "expected the charts route to swap the heavy inline hero for the dedicated chart setup hero bar",
);

assert.match(
  source,
  /import \{[\s\S]*ChartSetupStageAction[\s\S]*ChartSetupStageShell[\s\S]*\} from "@\/components\/charts\/ChartSetupGuidedRail";/s,
  "expected the charts route to render the setup flow through the dedicated guided rail shell",
);

assert.match(
  source,
  /const \[activeStageKey,\s*setActiveStageKey\] = useState<ChartSetupStageKey>\("scope"\);/,
  "expected the charts route to track the active guided-rail stage locally",
);

assert.match(
  source,
  /<ChartSetupStageShell[\s\S]*title="Scope"[\s\S]*<ChartSetupStageShell[\s\S]*title="Metric"[\s\S]*<ChartSetupStageShell[\s\S]*title="Style"/s,
  "expected the charts setup UI to render the approved Scope -> Metric -> Style rail",
);

assert.match(
  source,
  /title="Open Chart"[\s\S]*subtitle="Launch this chart with the current setup"/,
  "expected the primary Open Chart CTA to move into the final Style stage",
);

console.log("chart-guided-rail-route.test.cjs passed");
