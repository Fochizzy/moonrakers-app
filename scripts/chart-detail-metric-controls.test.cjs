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
  /function handleMetricChange\(nextMetric: string\)/,
  "expected the chart detail screen to define a shared in-place metric change handler"
);

assert.match(
  source,
  /router\.setParams\(\{\s*metric:\s*normalized\s*\}\s*as any\)/,
  "expected chart detail metric changes to stay on the detail route by updating the metric param"
);

assert.match(
  source,
  /metricOptions\.length\s*>\s*1/,
  "expected the chart detail screen to render a compact metric rail when multiple metrics are available"
);

assert.match(
  source,
  /<Sparkline[\s\S]*metricOptions=\{serverMetricOptions as any\}[\s\S]*activeMetricKey=\{activeMetric \?\? undefined\}[\s\S]*onChangeMetric=\{handleMetricChange\}/,
  "expected Sparkline chart detail wiring to pass metric options and a shared change handler"
);

assert.match(
  source,
  /<StackedBarChart[\s\S]*metricOptions=\{serverMetricOptions as any\}[\s\S]*activeMetricKey=\{activeMetric \?\? undefined\}[\s\S]*onChangeMetric=\{handleMetricChange\}/,
  "expected StackedBarChart detail wiring to pass metric options and a shared change handler"
);

// stacked_bar_chart is in DETAIL_METRIC_CONTROL_KEYS, so the detail rail already
// owns metric choice. The chart's own selector must stay suppressed or the screen
// renders two independent metric pickers over the same chart.
assert.match(
  source,
  /<StackedBarChart[\s\S]*showMetricSelector=\{false\}[\s\S]*showCategorySelector=\{false\}/,
  "expected the stacked-bar detail view to suppress its built-in selectors in favour of the shared detail metric rail"
);

assert.match(
  source,
  /const DETAIL_METRIC_CONTROL_KEYS = new Set\(\[[\s\S]*"stacked_bar_chart",/,
  "expected stacked_bar_chart to stay on the shared detail metric rail"
);

console.log("chart-detail-metric-controls.test.cjs passed");
