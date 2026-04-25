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
  });

  assert.deepEqual(dataset.includedGameIds, ["jg-only"]);
  assert.equal(dataset.gameCount, 1);
  assert.equal(dataset.exactScopeApplied, true);
  assert.equal(dataset.edges[0].assistCount, 1);
  assert.equal(dataset.edges[0].assistPrestige, 2);
  assert.equal(dataset.edges[0].assistEfficiency, 2);
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
    },
    {
      id: "greg",
      incomingCount: 0,
      outgoingCount: 0,
      incomingPrestige: 0,
      outgoingPrestige: 0,
      supportBalance: 0,
    },
  ]);
});
