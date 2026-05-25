const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

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

const { buildAssistNetworkDataset } = require(path.join(
  __dirname,
  "..",
  "components",
  "charts",
  "AssistNetworkOverview",
  "buildAssistNetworkDataset.ts"
));
const { buildAssistNetworkLayout } = require(path.join(
  __dirname,
  "..",
  "components",
  "charts",
  "AssistNetworkOverview",
  "buildAssistNetworkLayout.ts"
));
const {
  collectUnifiedGames,
  canonicalizeGames,
} = require(path.join(__dirname, "..", "utils", "charts.ts"));
const {
  normalizeCloudSnapshot,
} = require(path.join(__dirname, "..", "lib", "cloud", "normalizeCloudSnapshot.ts"));

function requireAssistNetworkImpact() {
  return require(path.join(
    __dirname,
    "..",
    "components",
    "charts",
    "AssistNetworkOverview",
    "buildAssistNetworkImpact.ts"
  ));
}

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

const exactAndOverallFixtureGames = [
  {
    id: "james-greg-a",
    players: [{ id: "james" }, { id: "greg" }],
    winnerId: "james",
    rounds: [
      {
        id: "r1",
        playerId: "james",
        assistRecipients: { greg: 1 },
        assistPrestigeRecipients: { greg: 2 },
      },
    ],
    timeline: [],
    totals: {
      james: { totalPrestige: 12, turns: 4, efficiency: 3 },
      greg: { totalPrestige: 8, turns: 4, efficiency: 2 },
    },
  },
  {
    id: "james-greg-b",
    players: [{ id: "james" }, { id: "greg" }],
    winnerId: "greg",
    rounds: [],
    timeline: [],
    totals: {
      james: { totalPrestige: 10, turns: 4, efficiency: 2.5 },
      greg: { totalPrestige: 11, turns: 4, efficiency: 2.75 },
    },
  },
  {
    id: "james-greg-izzy",
    players: [{ id: "james" }, { id: "greg" }, { id: "izzy" }],
    winnerId: "izzy",
    rounds: [
      {
        id: "r2",
        playerId: "james",
        assistRecipients: { greg: 1 },
        assistPrestigeRecipients: { greg: 5 },
      },
    ],
    timeline: [],
    totals: {
      james: { totalPrestige: 6, turns: 4, efficiency: 1.5 },
      greg: { totalPrestige: 7, turns: 4, efficiency: 1.75 },
      izzy: { totalPrestige: 13, turns: 4, efficiency: 3.25 },
    },
  },
];

run("buildAssistNetworkDataset applies exact composition filtering and preserves real counts", () => {
  const dataset = buildAssistNetworkDataset({
    games: [
      {
        id: "jg-only",
        players: [{ id: "james" }, { id: "greg" }],
        rounds: [
          {
            id: "r1",
            playerId: "james",
            assistRecipients: { greg: 1 },
            assistPrestigeRecipients: { greg: 2 },
          },
        ],
        timeline: [],
        totals: {},
      },
      {
        id: "jig",
        players: [{ id: "james" }, { id: "izzy" }, { id: "greg" }],
        rounds: [
          {
            id: "r2",
            playerId: "james",
            assistRecipients: { greg: 1 },
            assistPrestigeRecipients: { greg: 5 },
          },
        ],
        timeline: [],
        totals: {},
      },
    ],
    scopedPlayerIds: ["james", "greg"],
    exactScopePlayerIds: ["james", "greg"],
  });

  assert.deepEqual(dataset.includedGameIds, ["jg-only"]);
  assert.equal(dataset.gameCount, 1);
  assert.equal(dataset.exactScopeApplied, true);
  assert.equal(dataset.edges[0].assistCount, 1);
  assert.equal(dataset.edges[0].assistPrestige, 2);
  assert.equal(dataset.edges[0].assistEfficiency, 2);
  assert.equal(dataset.edges[0].assistFrequencyPerGame, 1);
});

run("buildAssistNetworkDataset matches exact scope with normalized game player ids", () => {
  const dataset = buildAssistNetworkDataset({
    games: [
      {
        id: "trimmed-match",
        players: [{ id: " james " }, { id: " greg " }],
        rounds: [
          {
            id: "r1",
            playerId: " james ",
            assistRecipients: { " greg ": 1 },
            assistPrestigeRecipients: { " greg ": 3 },
          },
        ],
        timeline: [],
        totals: {},
      },
      {
        id: "extra-player",
        players: [{ id: "james" }, { id: "greg" }, { id: "izzy" }],
        rounds: [],
        timeline: [],
        totals: {},
      },
    ],
    scopedPlayerIds: ["james", "greg"],
    exactScopePlayerIds: ["james", "greg"],
  });

  assert.deepEqual(dataset.includedGameIds, ["trimmed-match"]);
  assert.equal(dataset.gameCount, 1);
  assert.equal(dataset.edges.length, 1);
  assert.equal(dataset.edges[0].id, "greg__james");
  assert.equal(dataset.edges[0].assistCount, 1);
  assert.equal(dataset.edges[0].assistPrestige, 3);
  assert.equal(dataset.edges[0].assistFrequencyPerGame, 1);
});

run("buildAssistNetworkDataset does not create counted edges from prestige-only recipient data", () => {
  const dataset = buildAssistNetworkDataset({
    games: [
      {
        id: "prestige-only",
        players: [{ id: "james" }, { id: "greg" }],
        rounds: [
          {
            id: "r1",
            playerId: "james",
            assistRecipients: {},
            assistPrestigeRecipients: { greg: 4 },
          },
        ],
        timeline: [],
        totals: {},
      },
    ],
    scopedPlayerIds: ["james", "greg"],
    exactScopePlayerIds: ["james", "greg"],
  });

  assert.deepEqual(dataset.includedGameIds, ["prestige-only"]);
  assert.equal(dataset.gameCount, 1);
  assert.equal(dataset.edges.length, 0);
  assert.deepEqual(dataset.nodes, [
    {
      id: "james",
      incomingCount: 0,
      outgoingCount: 0,
      incomingPrestige: 0,
      outgoingPrestige: 0,
      supportBalance: 0,
      involvementFrequencyPerGame: 0,
    },
    {
      id: "greg",
      incomingCount: 0,
      outgoingCount: 0,
      incomingPrestige: 0,
      outgoingPrestige: 0,
      supportBalance: 0,
      involvementFrequencyPerGame: 0,
    },
  ]);
});

run("buildAssistNetworkDataset reports an empty exact-match sample when no game matches the scoped table", () => {
  const dataset = buildAssistNetworkDataset({
    games: [
      {
        id: "three-player-only",
        players: [{ id: "james" }, { id: "greg" }, { id: "izzy" }],
        rounds: [],
        timeline: [],
        totals: {},
      },
    ],
    scopedPlayerIds: ["james", "greg"],
    exactScopePlayerIds: ["james", "greg"],
  });

  assert.equal(dataset.exactScopeApplied, true);
  assert.deepEqual(dataset.includedGameIds, []);
  assert.equal(dataset.gameCount, 0);
  assert.deepEqual(dataset.edges, []);
  assert.deepEqual(dataset.nodes, []);
});

run("buildAssistNetworkDataset derives frequency-per-game from the exact-match sample", () => {
  const dataset = buildAssistNetworkDataset({
    games: exactAndOverallFixtureGames,
    scopedPlayerIds: ["james", "greg"],
    exactScopePlayerIds: ["james", "greg"],
  });

  assert.equal(dataset.gameCount, 2);
  assert.equal(dataset.edges.length, 1);
  assert.equal(dataset.edges[0].id, "greg__james");
  assert.equal(dataset.edges[0].assistCount, 1);
  assert.equal(dataset.edges[0].assistFrequencyPerGame, 0.5);
  assert.equal(
    dataset.nodes.find((node) => node.id === "james").involvementFrequencyPerGame,
    0.5
  );
  assert.equal(
    dataset.nodes.find((node) => node.id === "greg").involvementFrequencyPerGame,
    0.5
  );
});

run("buildAssistNetworkDataset counts repeated same-direction assists within one exact-match game", () => {
  const dataset = buildAssistNetworkDataset({
    games: [
      {
        id: "repeat-link",
        players: [{ id: "james" }, { id: "greg" }],
        rounds: [
          {
            id: "r1",
            playerId: "james",
            assistRecipients: { greg: 1 },
            assistPrestigeRecipients: { greg: 2 },
          },
          {
            id: "r2",
            playerId: "james",
            assistRecipients: { greg: 1 },
            assistPrestigeRecipients: { greg: 1 },
          },
        ],
        timeline: [],
        totals: {},
      },
    ],
    scopedPlayerIds: ["james", "greg"],
    exactScopePlayerIds: ["james", "greg"],
  });

  assert.equal(dataset.gameCount, 1);
  assert.equal(dataset.edges.length, 1);
  assert.equal(dataset.edges[0].id, "greg__james");
  assert.equal(dataset.edges[0].assistCount, 2);
  assert.equal(dataset.edges[0].assistPrestige, 3);
  assert.equal(dataset.edges[0].assistFrequencyPerGame, 2);
});

run("buildAssistNetworkDataset falls back to assist-source totals when round logs are empty", () => {
  const dataset = buildAssistNetworkDataset({
    games: [
      {
        id: "totals-only-a",
        players: [{ id: "james" }, { id: "greg" }],
        rounds: [],
        timeline: [],
        totals: {
          james: { totalPrestige: 11 },
          greg: {
            totalPrestige: 9,
            assistPrestigeBySource: { james: 4 },
          },
        },
      },
      {
        id: "totals-only-b",
        players: [{ id: "james" }, { id: "greg" }],
        rounds: [],
        timeline: [],
        totals: {
          james: { totalPrestige: 10 },
          greg: {
            totalPrestige: 8,
            assistPrestigeBySource: { james: 2 },
          },
        },
      },
    ],
    scopedPlayerIds: ["james", "greg"],
    exactScopePlayerIds: ["james", "greg"],
  });

  assert.equal(dataset.gameCount, 2);
  assert.equal(dataset.edges.length, 1);
  assert.equal(dataset.edges[0].id, "greg__james");
  assert.equal(dataset.edges[0].assistCount, 2);
  assert.equal(dataset.edges[0].assistPrestige, 6);
  assert.equal(dataset.edges[0].assistFrequencyPerGame, 1);
});

run("buildAssistNetworkDataset infers separate exact-match directions from two-player legacy aggregate totals", () => {
  const dataset = buildAssistNetworkDataset({
    games: [
      {
        id: "two-player-legacy-both-ways",
        players: [{ id: "james" }, { id: "greg" }],
        rounds: [],
        timeline: [],
        totals: {
          james: {
            totalPrestige: 12,
            assists: 1,
            assistPrestigeReceived: 2,
          },
          greg: {
            totalPrestige: 9,
            assists: 2,
            assistPrestigeReceived: 1,
          },
        },
      },
    ],
    scopedPlayerIds: ["james", "greg"],
    exactScopePlayerIds: ["james", "greg"],
  });

  assert.equal(dataset.gameCount, 1);
  assert.equal(dataset.edges.length, 2);
  assert.deepEqual(
    dataset.edges.map((edge) => ({
      id: edge.id,
      assistCount: edge.assistCount,
      assistPrestige: edge.assistPrestige,
      assistFrequencyPerGame: edge.assistFrequencyPerGame,
    })),
    [
      {
        id: "james__greg",
        assistCount: 2,
        assistPrestige: 2,
        assistFrequencyPerGame: 2,
      },
      {
        id: "greg__james",
        assistCount: 1,
        assistPrestige: 1,
        assistFrequencyPerGame: 1,
      },
    ]
  );
});

run("buildAssistNetworkDataset flags aggregate-only exact-match samples when direction is missing", () => {
  const dataset = buildAssistNetworkDataset({
    games: [
      {
        id: "legacy-aggregate-only",
        players: [{ id: "james" }, { id: "greg" }, { id: "izzy" }],
        rounds: [],
        timeline: [],
        totals: {
          james: { totalPrestige: 12, assists: 1 },
          greg: { totalPrestige: 8, assistPrestigeReceived: 2 },
          izzy: { totalPrestige: 7 },
        },
      },
    ],
    scopedPlayerIds: ["james", "greg", "izzy"],
    exactScopePlayerIds: ["james", "greg", "izzy"],
  });

  assert.equal(dataset.gameCount, 1);
  assert.equal(dataset.edges.length, 0);
  assert.equal(dataset.hasAggregateAssistActivityWithoutDirection, true);
});

run("assistCountBySource survives the unified chart pipeline and creates exact-match edges", () => {
  const rawStore = {
    games: [
      {
        id: "counts-only",
        players: [
          { id: "james", name: "James" },
          { id: "greg", name: "Greg" },
        ],
        rounds: [],
        timeline: [],
        totals: {
          james: {
            totalPrestige: 11,
            turns: 4,
          },
          greg: {
            totalPrestige: 9,
            turns: 4,
            assistCountBySource: { james: 2 },
          },
        },
      },
    ],
  };

  const rawGames = collectUnifiedGames(rawStore);
  const unifiedGames = canonicalizeGames(rawGames, [
    { id: "james", name: "James" },
    { id: "greg", name: "Greg" },
  ]);

  const dataset = buildAssistNetworkDataset({
    games: unifiedGames,
    scopedPlayerIds: ["james", "greg"],
    exactScopePlayerIds: ["james", "greg"],
  });

  assert.equal(dataset.gameCount, 1);
  assert.equal(dataset.edges.length, 1);
  assert.equal(dataset.edges[0].id, "greg__james");
  assert.equal(dataset.edges[0].assistCount, 2);
  assert.equal(dataset.edges[0].assistPrestige, 0);
  assert.equal(dataset.edges[0].assistFrequencyPerGame, 2);
});

run("cloud snapshot rounds with assist counts but zero assist prestige still create exact-match edges", () => {
  const snapshot = normalizeCloudSnapshot({
    games: [
      {
        id: "cloud-counts-only",
        created_at: "2026-04-26T00:00:00.000Z",
        winner_profile_id: "james",
        game_participants: [
          {
            id: "row-james",
            profile_id: "james",
            player_name_snapshot: "James",
            start_order: 0,
            total_prestige: 12,
            direct_prestige: 12,
            assist_prestige_received: 0,
            objective_prestige: 0,
            score: 12,
            assists: 2,
            failures: 0,
            contracts: 2,
          },
          {
            id: "row-greg",
            profile_id: "greg",
            player_name_snapshot: "Greg",
            start_order: 1,
            total_prestige: 8,
            direct_prestige: 8,
            assist_prestige_received: 0,
            objective_prestige: 0,
            score: 8,
            assists: 0,
            failures: 0,
            contracts: 1,
          },
        ],
        game_rounds: [
          {
            participant_id: "row-james",
            round_index: 0,
            prestige: 6,
            contracts: 1,
            failures: 0,
            assist_recipients: { greg: 1 },
            assist_prestige_recipients: {},
            objective_count: 0,
            objective_prestige: 0,
            created_at: "2026-04-26T00:00:00.000Z",
          },
          {
            participant_id: "row-james",
            round_index: 1,
            prestige: 6,
            contracts: 1,
            failures: 0,
            assist_recipients: { greg: 1 },
            assist_prestige_recipients: {},
            objective_count: 0,
            objective_prestige: 0,
            created_at: "2026-04-26T00:05:00.000Z",
          },
        ],
      },
    ],
  });

  const dataset = buildAssistNetworkDataset({
    games: snapshot.games,
    scopedPlayerIds: ["james", "greg"],
    exactScopePlayerIds: ["james", "greg"],
  });

  assert.equal(dataset.gameCount, 1);
  assert.equal(dataset.edges.length, 1);
  assert.equal(dataset.edges[0].id, "greg__james");
  assert.equal(dataset.edges[0].assistCount, 2);
  assert.equal(dataset.edges[0].assistPrestige, 0);
  assert.equal(dataset.edges[0].assistFrequencyPerGame, 2);
});

run("buildAssistNetworkImpact compares exact-table results against overall baseline", () => {
  const { buildAssistNetworkImpact } = requireAssistNetworkImpact();
  const impact = buildAssistNetworkImpact({
    games: exactAndOverallFixtureGames,
    exactScopePlayerIds: ["james", "greg"],
  });

  assert.equal(impact.sampleGameCount, 2);
  assert.equal(impact.cards.totalPrestige.delta > 0, true);
  assert.equal(impact.cards.winning.delta < 0, false);
  assert.equal(Number.isFinite(impact.cards.efficiency.delta), true);
});

run("buildAssistNetworkLayout uses assist frequency for link weights and per-game labels", () => {
  const layout = buildAssistNetworkLayout(
    [
      {
        sourceId: "james",
        targetId: "greg",
        assistCount: 2,
        assistPrestige: 10,
        assistEfficiency: 99,
        assistFrequencyPerGame: 0.8,
      },
    ],
    [{ id: "james", name: "James" }, { id: "greg", name: "Greg" }]
  );

  assert.equal(layout.links.length, 1);
  assert.equal(layout.links[0].assistCount, 2);
  assert.equal(layout.links[0].assistPrestige, 10);
  assert.equal(layout.links[0].assistEfficiency, 99);
  assert.equal(layout.links[0].assistFrequencyPerGame, 0.8);
  assert.equal(layout.links[0].labelText, "0.8/game");
  assert.equal(layout.links[0].value, 0.8);
  assert.equal(layout.maxValue, 0.8);
});

run("buildAssistNetworkLayout sizes nodes from involvement frequency", () => {
  const forward = [
    {
      sourceId: "james",
      targetId: "greg",
      assistCount: 2,
      assistPrestige: 10,
      assistEfficiency: 5,
      assistFrequencyPerGame: 0.8,
    },
  ];
  const players = [
    { id: "james", name: "James" },
    { id: "greg", name: "Greg" },
  ];
  const layout = buildAssistNetworkLayout(forward, players);

  assert.equal(layout.nodes.length, 2);
  assert.equal(layout.nodes[0].value, 0.8);
  assert.equal(layout.nodes[0].involvementFrequencyPerGame, 0.8);
  assert.equal(layout.nodes[1].value, 0.8);
  assert.equal(layout.nodes[1].involvementFrequencyPerGame, 0.8);
});
