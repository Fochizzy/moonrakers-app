const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function patchedResolveFilename(
  request,
  parent,
  isMain,
  options,
) {
  if (request.startsWith("@/")) {
    request = path.join(projectRoot, request.slice(2));
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(mod, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        allowJs: true,
      },
      fileName: filename,
    });

    mod._compile(outputText, filename);
  };
}

const {
  buildReplaySnapshotsFromGame,
  collectUnifiedGames,
} = require("../utils/charts.ts");
const {
  buildLocalChartDetailState,
} = require("../utils/chartDetailLocalData.ts");

const players = [
  { id: "luna", name: "Luna", color: "#3B82F6" },
  { id: "sol", name: "Sol", color: "#22C55E" },
];

const games = [
  {
    id: "game-1",
    createdAt: 100,
    players,
    rounds: [],
    timeline: [
      {
        id: "timeline-1",
        playerId: "luna",
        directPrestige: 2,
        assistPrestigeReceived: 1,
        contracts: 1,
        failures: 0,
        assists: 1,
        createdAt: 1,
      },
      {
        id: "timeline-2",
        playerId: "sol",
        directPrestige: 3,
        assistPrestigeReceived: 0,
        contracts: 1,
        failures: 0,
        assists: 0,
        createdAt: 2,
      },
    ],
    totals: {
      luna: {
        score: 3,
        totalPrestige: 3,
        directPrestige: 2,
        assistPrestigeReceived: 1,
        contracts: 1,
        failures: 0,
        assists: 1,
      },
      sol: {
        score: 3,
        totalPrestige: 3,
        directPrestige: 3,
        assistPrestigeReceived: 0,
        contracts: 1,
        failures: 0,
        assists: 0,
      },
    },
  },
  {
    id: "game-2",
    createdAt: 200,
    players,
    rounds: [
      {
        id: "round-1",
        playerId: "luna",
        directPrestige: 4,
        assistPrestigeReceived: 0,
        contracts: 2,
        failures: 0,
        assists: 0,
        createdAt: 3,
      },
      {
        id: "round-2",
        playerId: "sol",
        directPrestige: 1,
        assistPrestigeReceived: 2,
        contracts: 1,
        failures: 0,
        assists: 1,
        createdAt: 4,
      },
    ],
    totals: {
      luna: {
        score: 4,
        totalPrestige: 4,
        directPrestige: 4,
        assistPrestigeReceived: 0,
        contracts: 2,
        failures: 0,
        assists: 0,
      },
      sol: {
        score: 3,
        totalPrestige: 3,
        directPrestige: 1,
        assistPrestigeReceived: 2,
        contracts: 1,
        failures: 0,
        assists: 1,
      },
    },
  },
];

const normalizedGames = collectUnifiedGames({ games });
const timelineOnlyReplay = buildReplaySnapshotsFromGame(normalizedGames[0]);

assert.equal(
  timelineOnlyReplay.length,
  2,
  "expected replay snapshots to fall back to timeline entries when rounds are missing",
);

assert.equal(
  timelineOnlyReplay[1].snapshot.sol.totalPrestige,
  3,
  "expected timeline-based replay snapshots to preserve running total prestige",
);

const replayState = buildLocalChartDetailState({
  chartKey: "replay_chart",
  games,
  players,
  routeSelectedGameId: "game-1",
});

assert.equal(
  replayState.hasData,
  true,
  "expected replay fallback state to report local history data when a selected game exists",
);

assert.equal(
  replayState.snapshots.length,
  2,
  "expected replay fallback state to build per-step snapshots from the selected game",
);

assert.equal(
  replayState.chartPlayers.length,
  2,
  "expected replay fallback state to preserve the selected game's table players",
);

const lineState = buildLocalChartDetailState({
  chartKey: "line_chart",
  games,
  players,
  routePlayerId: "luna",
});

assert.equal(
  lineState.metricKey,
  "score",
  "expected line-chart fallback to default to score when no explicit metric is selected",
);

assert.equal(
  lineState.snapshots.length,
  2,
  "expected history fallback snapshots to cover each saved game",
);

const duplicateGregState = buildLocalChartDetailState({
  chartKey: "relationship_graph",
  players: [
    { id: "legacy-greg", name: "Legacy Greg" },
    { id: "GregMtG", name: "Greg", color: "green" },
    { id: "james", name: "James", color: "blue" },
  ],
  games: [
    {
      id: "greg-game-1",
      createdAt: 300,
      players: [
        { id: "legacy-greg", name: "Legacy Greg" },
        { id: "james", name: "James" },
      ],
      totals: {
        "legacy-greg": {
          score: 8,
          totalPrestige: 8,
          directPrestige: 5,
          assistPrestigeReceived: 2,
          objectivePrestige: 1,
          assists: 1,
          assistPrestigeBySource: { james: 2 },
        },
        james: {
          score: 10,
          totalPrestige: 10,
          directPrestige: 7,
          assistPrestigeReceived: 2,
          objectivePrestige: 1,
          assists: 1,
          assistPrestigeBySource: { "legacy-greg": 1 },
        },
      },
    },
  ],
});

assert.deepEqual(
  duplicateGregState.chartPlayers.map((player) => player.id),
  ["GregMtG", "james"],
  "expected duplicate-name chart fallback players to collapse legacy Greg onto GregMtG",
);

assert.equal(
  duplicateGregState.games[0]?.players.some((player) => player.id === "legacy-greg"),
  false,
  "expected canonical chart fallback games to stop carrying the legacy Greg player id",
);

assert.deepEqual(
  duplicateGregState.relationships,
  {
    GregMtG: { james: 1 },
    james: { GregMtG: 2 },
  },
  "expected local relationship graphs to remap Greg edges onto GregMtG",
);

const selectedRelationshipState = buildLocalChartDetailState({
  chartKey: "relationship_graph",
  routePlayerId: "zed",
  players: [
    { id: "alice", name: "Alice", color: "pink" },
    { id: "bob", name: "Bob", color: "blue" },
    { id: "zed", name: "Zed", color: "green" },
  ],
  games: [
    {
      id: "rel-game-1",
      createdAt: 400,
      players: [
        { id: "alice", name: "Alice" },
        { id: "bob", name: "Bob" },
        { id: "zed", name: "Zed" },
      ],
      totals: {
        alice: {
          score: 5,
          totalPrestige: 5,
          directPrestige: 4,
          assistPrestigeReceived: 1,
          objectivePrestige: 0,
          assists: 0,
          assistPrestigeBySource: { bob: 1 },
        },
        bob: {
          score: 7,
          totalPrestige: 7,
          directPrestige: 4,
          assistPrestigeReceived: 3,
          objectivePrestige: 0,
          assists: 2,
          assistPrestigeBySource: { zed: 1 },
        },
        zed: {
          score: 6,
          totalPrestige: 6,
          directPrestige: 4,
          assistPrestigeReceived: 2,
          objectivePrestige: 0,
          assists: 1,
          assistPrestigeBySource: { bob: 2 },
        },
      },
    },
  ],
});

assert.equal(
  selectedRelationshipState.selectedPlayer?.id,
  "zed",
  "expected the local relationship chart fallback to anchor the graph on the selected player",
);

assert.deepEqual(
  [...selectedRelationshipState.chartPlayers.map((player) => player.id)].sort(),
  ["bob", "zed"],
  "expected the local relationship chart fallback to hide players with no direct relationship to the selected player",
);

assert.deepEqual(
  [...selectedRelationshipState.scopedPlayerIds].sort(),
  ["bob", "zed"],
  "expected the relationship chart scope ids to match the selected player's direct relationship set",
);

assert.deepEqual(
  selectedRelationshipState.relationships,
  {
    bob: { zed: 2 },
    zed: { bob: 1 },
  },
  "expected the relationship chart fallback to keep only edges touching the selected player's network",
);

const chartDetailSource = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "[chartKey].tsx"),
  "utf8",
);

assert.match(
  chartDetailSource,
  /buildLocalChartDetailState\(/,
  "expected chart detail route to build a chart fallback state from synced games",
);

assert.match(
  chartDetailSource,
  /shouldUseLocalChartFallback/,
  "expected chart detail route to switch into a local fallback rendering path",
);

assert.match(
  chartDetailSource,
  /players:\s*rpcFallbackPlayers\.length\s*\?\s*rpcFallbackPlayers\s*:\s*cloudFallbackPlayers[\s\S]*games:\s*rpcFallbackGames\.length\s*\?\s*rpcFallbackGames\s*:\s*cloudFallbackGames/,
  "expected the chart fallback state to derive from Supabase-published source history before falling back to the shared cloud snapshot",
);

assert.match(
  chartDetailSource,
  /case "relationship_graph":[\s\S]*<AssistNetworkOverview[\s\S]*scopedPlayerIds=\{routeIds\.length \? routeIds : scopedPlayerIds\}/,
  "expected the relationship chart fallback to pass the filtered selected-player scope into AssistNetworkOverview",
);

console.log("chart-detail-local-data.test.cjs passed");
