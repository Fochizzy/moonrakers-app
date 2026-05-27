const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const chartsPath = path.join(__dirname, "..", "utils", "charts.ts");
const chartsSource = fs.readFileSync(chartsPath, "utf8");
const transpiled = ts.transpileModule(chartsSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: chartsPath,
}).outputText;

const moduleRef = { exports: {} };
const sandbox = {
  module: moduleRef,
  exports: moduleRef.exports,
  require,
  console,
  process,
  __dirname: path.dirname(chartsPath),
  __filename: chartsPath,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
};

vm.runInNewContext(transpiled, sandbox, { filename: chartsPath });

const {
  getSupportedMetricKeysForChart,
  normalizeMetricForChart,
  buildReplaySnapshotsFromGame,
} = moduleRef.exports;

assert.equal(
  typeof getSupportedMetricKeysForChart,
  "function",
  "expected charts.ts to export getSupportedMetricKeysForChart",
);

assert.equal(
  typeof normalizeMetricForChart,
  "function",
  "expected charts.ts to export normalizeMetricForChart",
);

assert.equal(
  typeof buildReplaySnapshotsFromGame,
  "function",
  "expected charts.ts to export buildReplaySnapshotsFromGame",
);

const replaySafeHeatmapPhase1Keys = [
  "avgStartSeat",
  "leadConversion",
  "lateLeadConversion",
];

const unsupportedReplayHeatmapPhase1Keys = [
  "turnOrderWinCorrelation",
  "recentFormDelta",
];

for (const chartKey of ["heatmap"]) {
  const supported = getSupportedMetricKeysForChart(chartKey);
  for (const metricKey of replaySafeHeatmapPhase1Keys) {
    assert.ok(
      supported.includes(metricKey),
      `expected ${chartKey} to support ${metricKey} in local fallback`,
    );
  }
}

for (const chartKey of [
  "bar_chart",
  "bar",
  "heatmap",
  "line_chart",
  "line",
  "multi_line_chart",
  "multi-line-chart",
  "multi-line",
  "bump_chart",
  "consistency_band",
  "sparkline",
  "prestige_over_time",
]) {
  const supported = getSupportedMetricKeysForChart(chartKey);
  const phase1Keys =
    chartKey === "heatmap"
      ? unsupportedReplayHeatmapPhase1Keys
      : [...replaySafeHeatmapPhase1Keys, ...unsupportedReplayHeatmapPhase1Keys];

  for (const metricKey of phase1Keys) {
    assert.ok(
      !supported.includes(metricKey),
      `expected ${chartKey} to keep ${metricKey} out of conservative phase-1 fallback support`,
    );
  }
}

assert.equal(
  normalizeMetricForChart("bar_chart", "turnOrderWinCorrelation"),
  "score",
  "expected bar charts to fall back when a phase-1 metric is not conservatively supported",
);

assert.equal(
  normalizeMetricForChart("heatmap", "leadConversion"),
  "leadConversion",
  "expected heatmaps to preserve the phase-1 lead conversion metric",
);

assert.equal(
  normalizeMetricForChart("heatmap", "recentFormDelta"),
  "score",
  "expected heatmaps to fall back when a replay-unsafe phase-1 metric is requested",
);

assert.equal(
  normalizeMetricForChart("line_chart", "leadConversion"),
  "score",
  "expected unsupported phase-1 metrics to fall back to the line-chart default",
);

const replayGame = {
  id: "game-1",
  winnerId: "p1",
  players: [
    { id: "p1", name: "Alpha", color: "#111111", startOrder: 0 },
    { id: "p2", name: "Beta", color: "#222222", startOrder: 1 },
  ],
  rounds: [
    {
      id: "r1",
      playerId: "p1",
      directPrestige: 3,
      assistPrestigeReceived: 0,
      objectivePrestige: 0,
      contracts: 1,
      failures: 0,
      assists: 0,
    },
    {
      id: "r2",
      playerId: "p2",
      directPrestige: 1,
      assistPrestigeReceived: 0,
      objectivePrestige: 0,
      contracts: 1,
      failures: 0,
      assists: 0,
    },
    {
      id: "r3",
      playerId: "p1",
      directPrestige: 2,
      assistPrestigeReceived: 0,
      objectivePrestige: 0,
      contracts: 1,
      failures: 0,
      assists: 0,
    },
    {
      id: "r4",
      playerId: "p2",
      directPrestige: 1,
      assistPrestigeReceived: 0,
      objectivePrestige: 0,
      contracts: 1,
      failures: 0,
      assists: 0,
    },
  ],
};

const replaySnapshots = buildReplaySnapshotsFromGame(replayGame);
assert.equal(
  replaySnapshots.length,
  4,
  "expected replay snapshots to keep one point per round",
);

for (const snapshot of replaySnapshots) {
  for (const [playerId, expectedSeat, expectedLead, expectedLateLead] of [
    ["p1", 1, 100, 100],
    ["p2", 2, 0, 0],
  ]) {
    const entry = snapshot?.snapshot?.[playerId];
    assert.ok(
      entry && typeof entry === "object",
      `expected replay snapshot ${snapshot.label} to include a running entry for ${playerId}`,
    );

    assert.equal(
      entry.avgStartSeat,
      expectedSeat,
      `expected replay snapshot ${snapshot.label} to keep avgStartSeat for ${playerId}`,
    );

    assert.equal(
      entry.leadConversion,
      expectedLead,
      `expected replay snapshot ${snapshot.label} to keep leadConversion for ${playerId}`,
    );

    assert.equal(
      entry.lateLeadConversion,
      expectedLateLead,
      `expected replay snapshot ${snapshot.label} to keep lateLeadConversion for ${playerId}`,
    );
  }
}

console.log("chart-phase1-metric-options.test.cjs passed");
