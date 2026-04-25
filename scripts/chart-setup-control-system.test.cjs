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
  /import SegmentedControl from "@\/components\/ui\/SegmentedControl";/,
  "expected short setup groups to use the shared segmented control"
);

assert.match(
  source,
  /import ChartUnderlineTabs from "@\/components\/charts\/ChartUnderlineTabs";/,
  "expected longer setup groups to fall back to the lighter underline-tab control"
);

assert.match(
  source,
  /function canUseSegmentedControl\(items: readonly SetupOption\[\]\)\s*\{[\s\S]*items\.length >= 2[\s\S]*items\.length <= 4[\s\S]*item\.label\.length <= 14/,
  "expected the charts hub to choose segmented controls only for short selector sets"
);

assert.match(
  source,
  /function SetupTabs\([\s\S]*<SegmentedControl[\s\S]*<ChartUnderlineTabs/,
  "expected the charts hub to centralize the mixed tab-control system in one helper"
);

assert.match(
  source,
  /selectedChart\.key === "relationship_graph"[\s\S]*title="Assist metric"/,
  "expected the chart setup to always expose Assist metric for the profile assist network"
);

assert.doesNotMatch(
  source,
  /selectedChart\.key === "relationship_graph"[\s\S]*title="Graph view"/,
  "expected the old graph-variant setup section to be removed for relationship_graph"
);

assert.match(
  source,
  /title="Metric"[\s\S]*contentStyle=\{styles\.metricGrid\}[\s\S]*selectedChartMetricOptions\.map\(\(metric\) => \([\s\S]*<MetricButton/,
  "expected metric choices to render in the dedicated compact selector grid"
);

assert.match(
  source,
  /metricGrid:\s*\{[\s\S]*flexDirection:\s*"row"[\s\S]*flexWrap:\s*"wrap"[\s\S]*gap:\s*5\b/,
  "expected metric choices to use a structured two-column wrap layout"
);

assert.match(
  source,
  /metricButton:\s*\{[\s\S]*flexBasis:\s*"48%"[\s\S]*minHeight:\s*36\b[\s\S]*alignItems:\s*"flex-start"[\s\S]*gap:\s*5\b/,
  "expected each metric selector to use the new compact tile styling"
);

assert.match(
  source,
  /setupSection:\s*\{[\s\S]*padding:\s*6\b[\s\S]*borderRadius:\s*12\b/,
  "expected each setup section to tighten its card padding for the lighter control system"
);

assert.match(
  source,
  /actionChip:\s*\{[\s\S]*minHeight:\s*28\b[\s\S]*paddingHorizontal:\s*8\b[\s\S]*paddingVertical:\s*4\b/,
  "expected the remaining scope chips to use the smaller supporting style instead of the old chunky pills"
);

console.log("chart-setup-control-system.test.cjs passed");
