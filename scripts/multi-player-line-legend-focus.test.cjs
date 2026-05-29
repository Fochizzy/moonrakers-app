const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

const lineChartSource = read(path.join("components", "charts", "LineChart.tsx"));
const bumpChartSource = read(path.join("components", "charts", "BumpChart.tsx"));
const eloChartPlotSource = read(
  path.join("components", "charts", "ELO", "EloChartPlot.tsx"),
);
const sparklineSource = read(path.join("components", "charts", "Sparkline.tsx"));

assert.match(
  lineChartSource,
  /setFocusedPlayerIdState\(\(current\)\s*=>[\s\S]*current === row\.id[\s\S]*null : row\.id/,
  "expected the shared line chart legend to keep toggling focused-player highlighting",
);

assert.match(
  bumpChartSource,
  /setFocusedPlayerIdState\(\(current\)\s*=>[\s\S]*current === series\.playerId[\s\S]*null : series\.playerId/,
  "expected the bump chart legend to keep toggling focused-player highlighting",
);

assert.match(
  eloChartPlotSource,
  /const \[focusedPlayerIdState,\s*setFocusedPlayerIdState\] = useState<string \| null>\(null\);/,
  "expected the ELO plot to track legend-driven focused-player state locally",
);

assert.match(
  eloChartPlotSource,
  /onPress=\{\(\) =>\s*setFocusedPlayerIdState\(\(current\)\s*=>\s*current === entry\.id \? null : entry\.id\)\}/,
  "expected the ELO legend cards to toggle the focused player when tapped",
);

assert.match(
  eloChartPlotSource,
  /const hasExplicitFocus = Boolean\([\s\S]*focusedPlayerIdState[\s\S]*const activeFocusedPlayerId[\s\S]*row\.id === activeFocusedPlayerId[\s\S]*const strokeOpacity[\s\S]*hasExplicitFocus/,
  "expected the ELO plot to dim non-focused series when a legend player is active",
);

assert.match(
  sparklineSource,
  /const \[focusedSeriesKeyState,\s*setFocusedSeriesKeyState\] = useState<"primary" \| "comparison" \| null>\(null\);/,
  "expected the sparkline to track legend-driven series focus locally",
);

assert.match(
  sparklineSource,
  /const toggleFocusedSeries = useCallback\([\s\S]*setFocusedSeriesKeyState\(\(current\)\s*=>\s*current === nextKey \? null : nextKey\)/,
  "expected the sparkline to expose a reusable legend toggle for the focused series",
);

assert.match(
  sparklineSource,
  /const primaryStrokeOpacity = activeFocusedSeriesKey[\s\S]*const comparisonStrokeOpacity = activeFocusedSeriesKey/,
  "expected the sparkline to compute separate stroke opacities from the focused legend series",
);

assert.match(
  sparklineSource,
  /onPress=\{\(\) => toggleFocusedSeries\("primary"\)\}[\s\S]*onPress=\{\(\) => toggleFocusedSeries\("comparison"\)\}/,
  "expected both sparkline legend cards to toggle their matching series highlight",
);

console.log("multi-player-line-legend-focus.test.cjs passed");
