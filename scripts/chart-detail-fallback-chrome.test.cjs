const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const chartRouteSource = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "[chartKey].tsx"),
  "utf8",
);

const localFallbackMatch = chartRouteSource.match(
  /if \(shouldUseLocalChartFallback\) \{([\s\S]*?)const serverChart = renderServerChart\(\);/,
);

assert.ok(
  localFallbackMatch,
  "expected to find the local fallback chart branch in the shared chart detail route",
);

const localFallbackSource = localFallbackMatch[1];

assert.doesNotMatch(
  localFallbackSource,
  /title="Showing Supabase game history"/,
  "expected the chart detail local fallback surface to drop the extra Supabase-history title chrome",
);

assert.doesNotMatch(
  localFallbackSource,
  /The published chart dataset is unavailable right now, so this view is using Supabase game history directly\./,
  "expected the chart detail local fallback surface to drop the unavailable-dataset recovery copy",
);

assert.doesNotMatch(
  localFallbackSource,
  /The published chart dataset has no rows yet, so this view is using Supabase game history directly\./,
  "expected the chart detail local fallback surface to drop the no-rows recovery copy",
);

assert.doesNotMatch(
  localFallbackSource,
  /sourceLabel="Supabase fallback"/,
  "expected the chart detail local fallback surface to drop the Supabase fallback source badge",
);

assert.doesNotMatch(
  localFallbackSource,
  /label:\s*"Adjust setup"[\s\S]*label:\s*"Command"/,
  "expected the chart detail local fallback surface to drop the extra recovery action pills",
);

assert.doesNotMatch(
  chartRouteSource,
  /<ChartInsightStrip label="Source" value=\{provenance\.label\} \/>/,
  "expected the chart detail local fallback surface to drop the fallback source readout",
);

console.log("chart-detail-fallback-chrome.test.cjs passed");
