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
  options
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

const { buildPlaystyleSamples } = require("../utils/playstyleEngine.ts");
const {
  buildGlobalPlaystyleCorrelations,
  buildPersonalPlaystyleCorrelations,
} = require("../utils/playstyleCorrelationEngine.ts");
const { buildPlaystyleInsights } = require("../utils/playstyleInsights.ts");
const {
  rankPlaystyleLeaderboard,
} = require("../components/stats/playstyleLeaderboard.ts");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

{
  const players = [
    { id: "alice", name: "Alice", color: "#A855F7" },
    { id: "bob", name: "Bob", color: "#22C55E" },
  ];

  const games = [
    {
      id: "g-1",
      winnerId: "alice",
      players: [
        { id: "alice", startOrder: 0 },
        { id: "bob", startOrder: 1 },
      ],
      totals: {
        alice: {
          totalPrestige: 8,
          directPrestige: 5,
          assistPrestigeReceived: 2,
          objectiveCount: 1,
        },
        bob: {
          totalPrestige: 6,
          directPrestige: 3,
          assistPrestigeReceived: 1,
          objectiveCount: 2,
        },
      },
      rounds: [
        {
          id: "r-1",
          playerId: "alice",
          contracts: 1,
          failures: 0,
          assistRecipients: { bob: 1 },
          objectiveCount: 0,
        },
        {
          id: "r-2",
          playerId: "alice",
          contracts: 0,
          failures: 0,
          assistRecipients: {},
          objectiveCount: 0,
        },
        {
          id: "r-3",
          playerId: "alice",
          contracts: 0,
          failures: 0,
          assistRecipients: {},
          objectiveCount: 1,
          metaType: "bonusObjective",
        },
        {
          id: "r-4",
          playerId: "bob",
          contracts: 1,
          failures: 0,
          assistRecipients: { alice: 1 },
          objectiveCount: 0,
        },
        {
          id: "r-5",
          playerId: "bob",
          contracts: 0,
          failures: 1,
          assistRecipients: {},
          objectiveCount: 0,
        },
        {
          id: "r-6",
          playerId: "bob",
          contracts: 0,
          failures: 0,
          assistRecipients: {},
          objectiveCount: 2,
          metaType: "bonusObjective",
        },
      ],
    },
    {
      id: "g-2",
      players: [{ id: "alice", startOrder: 0 }],
      totals: {
        alice: {
          totalPrestige: 0,
          directPrestige: 0,
          assistPrestigeReceived: 0,
          objectiveCount: 0,
        },
      },
      rounds: [],
    },
    {
      id: "g-3",
      players: [{ id: "bob", startOrder: 0 }],
      totals: {
        bob: {
          totalPrestige: 9,
          directPrestige: 6,
          assistPrestigeReceived: 1,
          objectiveCount: 2,
          contracts: 3,
          failures: 1,
          turnsAtBase: 2,
        },
      },
      rounds: [],
    },
  ];

  const rows = buildPlaystyleSamples(players, games);
  const aliceRows = rows.filter((row) => row.playerId === "alice");
  const bobRows = rows.filter((row) => row.playerId === "bob");

  assert.deepEqual(aliceRows[0], {
    gameId: "g-1",
    playerId: "alice",
    playerName: "Alice",
    tableSize: 2,
    seat: 1,
    winFlag: 1,
    totalPrestige: 8,
    directPrestige: 5,
    assistPrestigeReceived: 2,
    objectivePoints: 1,
    assistsGiven: 1,
    assistsReceived: 1,
    stayAtBaseTurns: 1,
    playableTurns: 2,
    stayAtBaseRate: 0.5,
  });

  assert.equal(bobRows[0].objectivePoints, 2);
  assert.equal(bobRows[0].playableTurns, 2);
  assert.equal(bobRows[0].stayAtBaseTurns, 0);
  assert.equal(bobRows[1].stayAtBaseTurns, 2);
  assert.equal(bobRows[1].playableTurns, 6);
  assert.equal(bobRows[1].stayAtBaseRate, 2 / 6);
  assert.equal(aliceRows[1].playableTurns, 0);
  assert.equal(aliceRows[1].stayAtBaseRate, null);
}

{
  const samples = [
    {
      playerId: "alice",
      playerName: "Alice",
      stayAtBaseRate: 0.0,
      winFlag: 1,
      totalPrestige: 12,
      objectivePoints: 0,
      assistsGiven: 1,
      assistsReceived: 0,
    },
    {
      playerId: "alice",
      playerName: "Alice",
      stayAtBaseRate: 0.5,
      winFlag: 0,
      totalPrestige: 8,
      objectivePoints: 2,
      assistsGiven: 3,
      assistsReceived: 2,
    },
    {
      playerId: "alice",
      playerName: "Alice",
      stayAtBaseRate: 1.0,
      winFlag: 0,
      totalPrestige: 4,
      objectivePoints: 4,
      assistsGiven: 5,
      assistsReceived: 4,
    },
    {
      playerId: "bob",
      playerName: "Bob",
      stayAtBaseRate: 0.0,
      winFlag: 0,
      totalPrestige: 7,
      objectivePoints: 1,
      assistsGiven: 1,
      assistsReceived: 1,
    },
    {
      playerId: "bob",
      playerName: "Bob",
      stayAtBaseRate: 0.4,
      winFlag: 1,
      totalPrestige: 10,
      objectivePoints: 2,
      assistsGiven: 2,
      assistsReceived: 2,
    },
    {
      playerId: "bob",
      playerName: "Bob",
      stayAtBaseRate: 0.8,
      winFlag: 1,
      totalPrestige: 11,
      objectivePoints: 3,
      assistsGiven: 3,
      assistsReceived: 4,
    },
  ];

  const personal = buildPersonalPlaystyleCorrelations(samples, "alice", 3);
  const global = buildGlobalPlaystyleCorrelations(samples, 5);

  assert.deepEqual(
    personal.map((row) => row.key),
    ["wins", "prestige", "objectivePoints", "assistsGiven", "assistsReceived"]
  );
  assert.equal(personal.find((row) => row.key === "wins").status, "ok");
  assert.equal(personal.find((row) => row.key === "prestige").direction, "negative");
  assert.equal(
    personal.find((row) => row.key === "objectivePoints").direction,
    "positive"
  );
  assert.equal(
    personal.find((row) => row.key === "objectivePoints").label,
    "Objective Prestige"
  );
  assert.equal(global.find((row) => row.key === "wins").status, "ok");
}

{
  const insights = buildPlaystyleInsights({
    playerName: "Alice",
    personalRows: [
      {
        key: "prestige",
        label: "Prestige",
        value: -0.61,
        direction: "negative",
        strength: "Strong",
        status: "ok",
        sampleSize: 6,
      },
      {
        key: "wins",
        label: "Wins",
        value: 0,
        direction: "neutral",
        strength: "Minimal",
        status: "flat",
        sampleSize: 6,
      },
    ],
    globalRows: [
      {
        key: "objectivePoints",
        label: "Objective Prestige",
        value: 0.28,
        direction: "positive",
        strength: "Weak",
        status: "ok",
        sampleSize: 18,
      },
      {
        key: "assistsReceived",
        label: "Assists Received",
        value: 0,
        direction: "neutral",
        strength: "Minimal",
        status: "insufficient",
        sampleSize: 3,
      },
    ],
  });

  assert.match(insights[0], /Personally/i);
  assert.match(insights[1], /Globally/i);
  assert.match(insights.join(" "), /Not enough data yet/i);
}

{
  const ordered = rankPlaystyleLeaderboard({
    leaderboard: [
      { id: "james", name: "James", color: "#1D4ED8" },
      { id: "greg", name: "Greg", color: "#9333EA" },
      { id: "izzy", name: "Izzy", color: "#7C3AED" },
      { id: "corey", name: "Corey", color: "#0F766E" },
      { id: "alex", name: "Alex", color: "#16A34A" },
    ],
    authProfileId: "izzy",
    samples: [
      { playerId: "greg" },
      { playerId: "greg" },
      { playerId: "greg" },
      { playerId: "greg" },
      { playerId: "corey" },
      { playerId: "corey" },
      { playerId: "corey" },
      { playerId: "james" },
      { playerId: "james" },
      { playerId: "alex" },
    ],
  });

  assert.deepEqual(
    ordered.map((player) => player.id),
    ["izzy", "greg", "corey", "james", "alex"],
  );
}

{
  const statsSource = read(path.join("app", "stats.tsx"));
  assert.match(
    statsSource,
    /type StatsTab = "overview" \| "players" \| "playstyle" \| "correlations" \| "games";/
  );
  assert.match(statsSource, /label="Playstyle"/);
  assert.match(statsSource, /<PlaystyleSection/);
  assert.match(statsSource, /authProfileId=\{profileId \|\| null\}/);

  const sectionSource = read(path.join("components", "stats", "PlaystyleSection.tsx"));
  const leaderboardHelperSource = read(
    path.join("components", "stats", "playstyleLeaderboard.ts"),
  );
  const correlationSource = read(path.join("utils", "playstyleCorrelationEngine.ts"));
  assert.match(sectionSource, /buildPlaystyleSamples/);
  assert.match(sectionSource, /rankPlaystyleLeaderboard/);
  assert.match(sectionSource, /buildPersonalPlaystyleCorrelations/);
  assert.match(sectionSource, /buildGlobalPlaystyleCorrelations/);
  assert.match(sectionSource, /buildPlaystyleInsights/);
  assert.match(sectionSource, /Stay at Base Profile/);
  assert.match(sectionSource, /Objective Prestige/);
  assert.doesNotMatch(sectionSource, /Objective Points/);
  assert.match(leaderboardHelperSource, /authProfileId/);
  assert.match(leaderboardHelperSource, /playCount/);
  assert.match(correlationSource, /Objective Prestige/);
  assert.doesNotMatch(correlationSource, /Objective Points/);
  assert.match(sectionSource, /Assists Given/);
  assert.match(sectionSource, /Assists Received/);
}

console.log("playstyle-stats.test.cjs passed");
