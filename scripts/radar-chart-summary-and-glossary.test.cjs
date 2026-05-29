const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const radarSource = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "RadarChart", "RadarChart.tsx"),
  "utf8"
);
const definitionTargetsSource = fs.readFileSync(
  path.join(__dirname, "..", "utils", "definitionTargets.ts"),
  "utf8"
);
const definitionCatalogSource = fs.readFileSync(
  path.join(__dirname, "..", "utils", "definitionCatalog.ts"),
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
  /SummaryBulletRows/,
  "expected the radar chart to render summary lines through a shared bullet-row helper"
);

assert.match(
  radarSource,
  /function BulletRows\(/,
  "expected the radar chart to define a generic bullet-row helper that can be reused outside the summary card"
);

assert.match(
  radarSource,
  /summaryBulletRow/,
  "expected the radar chart to define bullet-row styling for summary lines"
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

assert.match(
  radarSource,
  /function ReportParagraphPanels[\s\S]*<BulletRows/s,
  "expected each deep report paragraph panel to render through the shared bullet-row helper"
);

assert.match(
  radarSource,
  /Trait Definitions[\s\S]*<Pressable[\s\S]*styles\.definitionItem/s,
  "expected trait definition rows to be pressable cards rather than static views"
);

assert.match(
  radarSource,
  /useRouter[\s\S]*usePathname[\s\S]*buildDefinitionsRoute/s,
  "expected the radar chart to build exact definitions routes for the pressable trait glossary rows"
);

for (const [metricKey, title] of [
  ["finisher", "Finisher"],
  ["starter", "Starter"],
  ["supporter", "Supporter"],
  ["receiver", "Receiver"],
  ["stability", "Stability"],
  ["risk", "Risk"],
  ["conversion", "Conversion"],
]) {
  assert.match(
    definitionTargetsSource,
    new RegExp(`"${metricKey}"`),
    `expected definitionTargets to recognize the ${metricKey} radar trait`
  );

  assert.match(
    definitionCatalogSource,
    new RegExp(`key: "${metricKey}"[\\s\\S]*title: "${title}"`),
    `expected definitionCatalog to include an exact glossary term for ${title}`
  );
}

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
