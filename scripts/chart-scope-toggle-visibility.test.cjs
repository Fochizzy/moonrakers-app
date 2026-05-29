const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const chartCatalogSource = fs.readFileSync(
  path.join(projectRoot, "components", "charts", "chartCatalog.ts"),
  "utf8",
);
const chartsRouteSource = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "index.tsx"),
  "utf8",
);
const railModelSource = fs.readFileSync(
  path.join(projectRoot, "components", "charts", "chartSetupRailModel.ts"),
  "utf8",
);

assert.match(
  chartCatalogSource,
  /export function supportsChartFocusPlayerToggle\(/,
  "expected the chart catalog to expose an explicit focus-player toggle capability helper",
);

assert.match(
  chartCatalogSource,
  /export function supportsChartScopePlayerToggle\(/,
  "expected the chart catalog to expose an explicit scope-player toggle capability helper",
);

assert.match(
  chartsRouteSource,
  /const hasFocusPlayerToggle = supportsChartFocusPlayerToggle\(selectedChart\.key\);/,
  "expected the charts route to derive focus-player visibility from the chart capability helper",
);

assert.match(
  chartsRouteSource,
  /const hasScopePlayerToggle = supportsChartScopePlayerToggle\(selectedChart\.key\);/,
  "expected the charts route to derive scope-player visibility from the chart capability helper",
);

assert.match(
  chartsRouteSource,
  /const focusPlayerOptions = useMemo\(\s*\(\) =>\s*hasFocusPlayerToggle\s*\?/s,
  "expected the charts route to suppress focus-player options when the chart does not support that toggle",
);

assert.match(
  chartsRouteSource,
  /const scopePlayerOptions = useMemo\(\s*\(\) =>\s*hasScopePlayerToggle\s*\?/s,
  "expected the charts route to suppress scope-player options when the chart does not support that toggle",
);

assert.match(
  chartsRouteSource,
  /\{hasFocusPlayerToggle && focusPlayerOptions\.length > 0 \? \(/,
  "expected the scope stage to hide the focus-player section when the chart does not use it",
);

assert.match(
  chartsRouteSource,
  /\{hasScopePlayerToggle && scopePlayerOptions\.length > 0 \? \(/,
  "expected the scope stage to hide the scope-player section when the chart does not use it",
);

assert.match(
  railModelSource,
  /if \(!focus\) return scopedCount > 0 \? `\$\{scopedCount\} players` : null;/,
  "expected the scope-stage summary helper to fall back to a count-only summary for scope-only charts",
);

console.log("chart-scope-toggle-visibility.test.cjs passed");
