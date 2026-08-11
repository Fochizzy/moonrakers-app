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
  /getPreferredScopeIdsForChart\(\{[\s\S]*chartKey:\s*selectedChartKey[\s\S]*routeIds[\s\S]*currentIds:\s*selectedGroupIds/,
  "expected the chart setup route sync to preserve exact-scope ids through a chart-aware helper"
);

assert.match(
  source,
  /const appliedRouteScopeKeyRef = useRef<string \| null>\(null\);/,
  "expected the chart setup to track which route scope seed has already been applied"
);

assert.match(
  source,
  /const routeScopeSeedKey = useMemo\(\s*\(\) => buildRouteScopeSeedKey\(selectedChartKey,\s*routeIds\),\s*\[selectedChartKey,\s*routeIds\]\s*\);/,
  "expected the chart setup to derive a stable route scope seed key from the chart and route ids"
);

assert.match(
  source,
  /if \(routeScopeSeedKey && appliedRouteScopeKeyRef\.current === routeScopeSeedKey\) \{[\s\S]*return;[\s\S]*\}/,
  "expected the chart setup route sync to seed route ids once instead of overwriting later chip edits"
);

assert.match(
  source,
  /const minimumScopeCount = selectedChart\.key === "relationship_graph" \? 2 : 1;[\s\S]*if \(current.length <= minimumScopeCount\) return current;/,
  "expected the Assist Network setup to keep at least two players selected"
);

assert.doesNotMatch(
  source,
  /title="Assist metric"/,
  "expected the chart setup to drop the Assist metric section for the Assist Network"
);

assert.doesNotMatch(
  source,
  /assist_network_overview/,
  "expected the charts hub launch contract to stop relying on the retired assist_network_overview alias"
);

// Gate on the chart being routed to. scopePlayerOptions still describes the
// previously selected chart, so using it would attach scope ids to charts whose
// supportsChartScopePlayerToggle is false.
assert.match(
  source,
  /if \(supportsScopePlayerToggle && selectedGroupIds\.length\) \{[\s\S]*params\.ids = selectedGroupIds\.join\(","\);/,
  "expected the charts hub launch contract to serialize selected player ids only for charts that support scoping"
);

assert.match(
  source,
  /const supportsScopePlayerToggle = supportsChartScopePlayerToggle\(chart\.key\);/,
  "expected the launch contract to derive scope support from the target chart"
);

assert.doesNotMatch(
  source,
  /params\.assistMode = selectedAssistMode|selectedAssistMode|normalizeAssistMode|ASSIST_MODE_OPTIONS/,
  "expected the Assist Network setup to remove assist-mode state and launch plumbing"
);

assert.match(
  source,
  /function replaceChartHubRoute\(chart: ChartCatalogEntry, setupOpen: boolean\)\s*\{[\s\S]*router\.setParams\(\s*buildChartHubParams\(chart,\s*setupOpen\)\s+as any\s*\);[\s\S]*\}/,
  "expected the charts hub route state to keep relationship_graph in sync without re-navigating the current screen"
);

assert.doesNotMatch(
  source,
  /detailMode\s*=|params\.graphVariant|graphVariant\s*=/,
  "expected the charts hub launch contract to drop the retired graphVariant detail-mode plumbing"
);

assert.match(
  source,
  /function openChart\(chart: ChartCatalogEntry\)\s*\{[\s\S]*const hubParams = buildChartHubParams\(chart,\s*true\)[\s\S]*router\.push\(\{[\s\S]*params: detailRouteParams,/,
  "expected the detail launch to push relationship_graph route params from the shared hub param builder"
);

assert.match(
  source,
  /function openSetup\(\)\s*\{[\s\S]*setChartSetupOpen\(true\)/,
  "expected tapping Adjust to keep setup route state aligned with the open setup UI"
);

assert.doesNotMatch(
  source,
  /title="Graph mode"/,
  "expected the old relationship_graph Graph mode setup section to be removed"
);

console.log("chart-setup-control-system.test.cjs passed");
