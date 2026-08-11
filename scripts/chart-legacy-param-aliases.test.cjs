const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const detailSource = read(path.join("app", "charts", "[chartKey].tsx"));
const setupSource = read(path.join("app", "charts", "index.tsx"));

assert.match(
  detailSource,
  /focusPlayerId\?: string \| string\[];/,
  "expected the chart detail route params to accept the legacy focusPlayerId alias",
);

assert.match(
  detailSource,
  /metricKey\?: string \| string\[];/,
  "expected the chart detail route params to accept the legacy metricKey alias",
);

assert.match(
  detailSource,
  /const routePlayerId = getParam\(params\.playerId\) \?\? getParam\(params\.focusPlayerId\);/,
  "expected the chart detail route to honor focusPlayerId when legacy links omit playerId",
);

assert.match(
  detailSource,
  /const routeMetric = getParam\(params\.metric\) \?\? getParam\(params\.metricKey\);/,
  "expected the chart detail route to honor metricKey when legacy links omit metric",
);

assert.match(
  setupSource,
  /focusPlayerId\?: string \| string\[];/,
  "expected the chart setup route params to accept the legacy focusPlayerId alias",
);

assert.match(
  setupSource,
  /metricKey\?: string \| string\[];/,
  "expected the chart setup route params to accept the legacy metricKey alias",
);

assert.match(
  setupSource,
  /const routePlayerId = getParam\(params\.playerId\) \?\? getParam\(params\.focusPlayerId\);/,
  "expected the chart setup route to honor focusPlayerId when opening legacy chart links",
);

assert.match(
  setupSource,
  /const routeMetric = getParam\(params\.metric\) \?\? getParam\(params\.metricKey\);/,
  "expected the chart setup route to honor metricKey when opening legacy chart links",
);

console.log("chart-legacy-param-aliases.test.cjs passed");
