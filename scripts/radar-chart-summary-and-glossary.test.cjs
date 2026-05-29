const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const radarSource = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "RadarChart", "RadarChart.tsx"),
  "utf8"
);

assert.match(
  radarSource,
  /Comparison Summary/,
  "expected the radar chart to render a comparison summary block below the plot"
);

assert.match(
  radarSource,
  /Trait Definitions/,
  "expected the radar chart to explain each radar trait under the chart"
);

assert.match(
  radarSource,
  /deepReportIntroCard/,
  "expected the radar chart to render a dedicated deep-report intro card"
);

assert.match(
  radarSource,
  /deepReportSectionCard/,
  "expected the radar chart to render stacked deep-report section cards"
);

assert.match(
  radarSource,
  /reportParagraphPanel/,
  "expected the radar chart to render inset paragraph panels inside deep report cards"
);

assert.match(
  radarSource,
  /style={styles\.reportParagraphPanel}/,
  "expected each deep report paragraph to render inside a dedicated panel wrapper"
);

assert.doesNotMatch(
  radarSource,
  /<View style={styles\.deepReportCard}>[\s\S]*reportSectionStack/s,
  "expected the radar chart to stop rendering the full deep report inside one monolithic card"
);

assert.doesNotMatch(
  radarSource,
  /<RadarChartInspector/,
  "expected the duplicate bottom radar inspector card to be removed"
);

console.log("radar-chart-summary-and-glossary.test.cjs passed");
