const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const radarSource = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "RadarChart", "RadarChart.tsx"),
  "utf8"
);

assert.match(
  radarSource,
  /<ChartFocusCard[\s\S]*<ChartStage[\s\S]*Comparison Summary[\s\S]*Deep Comparison Report[\s\S]*Trait Definitions/s,
  "expected the radar chart to keep the focus card, staged plot, comparison summary, deep comparison report, and trait glossary seam"
);

assert.match(
  radarSource,
  /Tap a point to highlight its matching axis definition, or tap a row to open the full glossary term\./,
  "expected the radar chart to explain both highlight and glossary-link behavior in the trait glossary"
);

assert.match(
  radarSource,
  /Deep Comparison Report[\s\S]*<ReportParagraphPanels[\s\S]*Trait Definitions/s,
  "expected the radar chart to keep inset paragraph panels inside the deep comparison report before the glossary"
);

assert.match(
  radarSource,
  /Comparison Summary[\s\S]*<SummaryBulletRows[\s\S]*Deep Comparison Report/s,
  "expected the radar chart to render bullet-row summaries between the chart stage and the deep report"
);

assert.match(
  radarSource,
  /function ReportParagraphPanels[\s\S]*<BulletRows/s,
  "expected deep-report paragraph panels to render bullet rows inside each inset card"
);

assert.match(
  radarSource,
  /Trait Definitions[\s\S]*<Pressable[\s\S]*definitionBody/s,
  "expected the trait glossary list to expose full-row press targets"
);

console.log("radar-chart-style.test.cjs passed");
