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
  /const hasMetricStageChoices = metricOptions\.length > 0;/,
  "expected the charts setup flow to detect when the metric stage has real choices",
);

assert.match(
  source,
  /const hasStyleStageChoices =/,
  "expected the charts setup flow to detect when the style stage has real choices",
);

assert.match(
  source,
  /const visibleRailStages = useMemo\(/,
  "expected the charts setup flow to derive a visible stage list instead of always rendering all three",
);

assert.match(
  source,
  /railStages\.filter\(\(stage\) => visibleStageKeys\.includes\(stage\.key\)\)/,
  "expected the charts setup flow to hide empty metric or style stages instead of always rendering all three",
);

assert.doesNotMatch(
  source,
  /This chart uses a fixed metric, so there is nothing to choose here\./,
  "expected the empty fixed-metric placeholder card to be removed once the stage is hidden",
);

assert.doesNotMatch(
  source,
  /This chart is ready to launch with the current default style\./,
  "expected the empty default-style placeholder card to be removed once the stage is hidden",
);

assert.match(
  source,
  /title="Open Chart"[\s\S]*subtitle="Launch this chart with the current setup"/,
  "expected the primary Open Chart CTA to move into the final Style stage",
);

assert.match(
  source,
  /<ChartSetupStageShell[\s\S]*title="Scope"[\s\S]*hideStepLabel[\s\S]*hideTitle/s,
  "expected the Scope stage to suppress the Step and Scope header labels",
);

assert.match(
  source,
  /<ChartSetupStageShell[\s\S]*title="Style"[\s\S]*hideStepLabel[\s\S]*hideTitle[\s\S]*hideHelperText[\s\S]*summary=\{null\}/s,
  "expected the Style stage to suppress the Step, Style, and helper header copy across charts",
);

console.log("chart-guided-rail-route.test.cjs passed");
