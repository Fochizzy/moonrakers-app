const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const chartHubSource = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "index.tsx"),
  "utf8",
);

assert.match(
  chartHubSource,
  /const shouldHonorRouteSetupParams = !setupOpen;/,
  "expected the chart setup screen to centralize the guard that prevents setup-open route params from overriding live local selections",
);

assert.match(
  chartHubSource,
  /const nextMetric = resolveOptionKey\(\s*metricOptions,\s*shouldHonorRouteSetupParams && getParam\(params\.metric\) != null\s*\?\s*routeMetric\s*:\s*null,\s*selectedMetric,\s*setupDefaults\.metricKey,\s*\);/s,
  "expected metric syncing to ignore route-backed metric params while the setup editor is open",
);

assert.match(
  chartHubSource,
  /const nextLineMode = resolveOptionKey\(\s*lineModeOptions,\s*shouldHonorRouteSetupParams && getParam\(params\.lineMode\) != null\s*\?\s*routeLineMode\s*:\s*null,\s*selectedLineMode,\s*setupDefaults\.lineMode,\s*\);/s,
  "expected style syncing to ignore route-backed line-mode params while the setup editor is open",
);

assert.match(
  chartHubSource,
  /const nextComparePlayerId = resolveOptionKey\(\s*comparePlayerOptions,\s*shouldHonorRouteSetupParams\s*\?\s*routeCompareId\s*:\s*null,\s*comparePlayerId,\s*setupDefaults\.comparePlayerId,\s*\);/s,
  "expected compare-player syncing to ignore route-backed params while the setup editor is open",
);

console.log("chart-setup-route-sync-guard.test.cjs passed");
