const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const chartScreenSource = read(path.join("app", "charts", "[chartKey].tsx"));

// The RadarChart barrel existed only to steer Metro's resolution; screens now
// import the concrete module directly, which is what has to stay true.
assert.equal(
  fs.existsSync(path.join(projectRoot, "components", "charts", "RadarChart", "RadarChart.tsx")),
  true,
  "expected the concrete RadarChart module to exist",
);

assert.match(
  chartScreenSource,
  /import RadarChart from "@\/components\/charts\/RadarChart\/RadarChart";/,
  "expected the chart detail screen to import the concrete RadarChart module directly",
);

console.log("radar-chart-module-resolution.test.cjs passed");
