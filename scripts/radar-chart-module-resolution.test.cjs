const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const radarIndexSource = read(path.join("components", "charts", "RadarChart", "index.ts"));
const chartScreenSource = read(path.join("app", "charts", "[chartKey].tsx"));
const chartHelpersSource = read(path.join("utils", "chartHelpers.tsx"));

assert.match(
  radarIndexSource,
  /export \{ default \} from '\.\/RadarChart\.tsx';/,
  "expected the RadarChart barrel to re-export the concrete TSX file explicitly for Metro resolution",
);

assert.match(
  radarIndexSource,
  /export \{ default as RadarChart \} from '\.\/RadarChart\.tsx';/,
  "expected the named RadarChart export to target the concrete TSX file explicitly",
);

assert.match(
  chartScreenSource,
  /import RadarChart from "@\/components\/charts\/RadarChart\/RadarChart";/,
  "expected the chart detail screen to import the concrete RadarChart module directly",
);

assert.match(
  chartHelpersSource,
  /import RadarChart from '@\/components\/charts\/RadarChart\/RadarChart';/,
  "expected chart helpers to import the concrete RadarChart module directly",
);

console.log("radar-chart-module-resolution.test.cjs passed");
