const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

const eloChartSource = read(path.join("components", "charts", "ELO", "EloChart.tsx"));
const eloChartPlotSource = read(
  path.join("components", "charts", "ELO", "EloChartPlot.tsx"),
);

assert.match(
  eloChartSource,
  /const \[selectedMode,\s*setSelectedMode\] = useState<[^>]+>\(DEFAULT_ELO_MODE\);/,
  "expected the ELO chart container to own local selected-mode state",
);

assert.match(
  eloChartSource,
  /deriveActiveEloChartView[\s\S]*deriveActiveEloChartView\(chartState,\s*selectedMode\)/,
  "expected the ELO chart container to reuse the shared derived-mode helper for rendered series and range state",
);

assert.match(
  eloChartPlotSource,
  /ChartUnderlineTabs/,
  "expected the ELO plot to render an in-chart mode rail",
);

assert.match(
  eloChartPlotSource,
  /label:\s*"ELO"[\s\S]*label:\s*"Delta"[\s\S]*label:\s*"Gap"/,
  "expected the mode rail to expose ELO, Delta, and Gap tabs",
);

// Per-mode branching lives in the shared helper module so the plot and the
// container cannot drift; the plot consumes it rather than re-implementing it.
const eloChartModeHelpersSource = read(
  path.join("components", "charts", "ELO", "eloChartModeHelpers.ts"),
);

assert.match(
  eloChartModeHelpersSource,
  /selectedMode === "eloDelta"|case "eloDelta"/,
  "expected the shared ELO mode helpers to branch on Delta mode",
);

assert.match(
  eloChartModeHelpersSource,
  /selectedMode === "matchupGap"|case "matchupGap"/,
  "expected the shared ELO mode helpers to branch on Gap mode",
);

assert.match(
  eloChartPlotSource,
  /import \{\s*buildEloModeInspectorCopy,\s*formatModeValue,\s*\} from "\.\/eloChartModeHelpers";/,
  "expected the ELO plot to consume the shared mode helpers rather than re-implementing formatModeValue",
);

console.log("elo-chart-mode-rail.test.cjs passed");
