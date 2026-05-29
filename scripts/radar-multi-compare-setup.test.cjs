const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const chartsSetupSource = fs.readFileSync(
  path.join(__dirname, "..", "app", "charts", "index.tsx"),
  "utf8",
);
const chartDetailSource = fs.readFileSync(
  path.join(__dirname, "..", "app", "charts", "[chartKey].tsx"),
  "utf8",
);
const appRoutesSource = fs.readFileSync(
  path.join(__dirname, "..", "utils", "appRoutes.ts"),
  "utf8",
);

assert.match(
  chartsSetupSource,
  /compareIds\?: string \| string\[];/,
  "expected the chart setup route params to accept a compareIds list for radar multi-compare selection",
);

assert.match(
  chartsSetupSource,
  /const \[selectedRadarCompareIds,\s*setSelectedRadarCompareIds\] = useState<string\[]>\(/,
  "expected the chart setup screen to track a dedicated radar multi-compare selection state",
);

assert.match(
  chartsSetupSource,
  /selectionMode="multiple"/,
  "expected the radar compare setup to use multi-select search results",
);

assert.match(
  chartsSetupSource,
  /params\.compareIds = selectedRadarCompareIds\.join\(","\);/,
  "expected opening the radar detail route to forward all selected compare ids",
);

assert.match(
  chartDetailSource,
  /const routeCompareIds = getParamList\(params\.compareIds\);/,
  "expected the chart detail route to read the radar compareIds param list",
);

assert.match(
  appRoutesSource,
  /compareIds\?: string\[];/,
  "expected shared chart route helpers to support compareIds for radar multi-compare reopen flows",
);

console.log("radar-multi-compare-setup.test.cjs passed");
