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

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

function assertStatementsMatch(statements, patterns, message) {
  assert.equal(
    statements.length,
    patterns.length,
    `${message} (expected ${patterns.length} statements)`
  );

  for (const [index, pattern] of patterns.entries()) {
    assert.match(
      statements[index],
      pattern,
      `${message} (statement ${index + 1})`
    );
  }
}

function assertUniqueStatements(statements, message) {
  assert.equal(
    new Set(statements).size,
    statements.length,
    `${message} (expected unique statement strings)`
  );
}

const {
  buildInsightSummaryStatements,
} = require("../utils/insightSummaries.ts");

const personalStatements = buildInsightSummaryStatements({
  tab: "pairingCorrelations",
  selectedPlayerLabel: "Fochizzy",
  metaGames: 9,
  personalRows: [
    { label: "Assist Target Prestige Gap vs Victory", value: 0.64 },
    { label: "Assists at 6+ Prestige vs Victory", value: 0.28 },
  ],
  pairingRows: [
    { label: "With Corey vs win rate", value: 0.71 },
    { label: "With GregMTG vs win rate", value: -0.42 },
  ],
  macroRows: [],
  turnOrderSummary: null,
  synergyPairs: [],
  players: [
    { id: "corey", name: "Corey" },
    { id: "greg", name: "GregMTG" },
  ],
});

assert.equal(
  personalStatements.length,
  4,
  "expected personal insights summaries to render four short statements"
);
assertStatementsMatch(
  personalStatements,
  [
    /Personal focus: Fochizzy\./i,
    /9 finished games are in sample\./i,
    /2 personal signals, 2 partner trends\./i,
    /Top read: With Corey vs win rate at \+0\.71\./i,
  ],
  "expected personal summaries to mention the focus player, sample size, counts, and strongest partner read"
);

const macroStatements = buildInsightSummaryStatements({
  tab: "macroCorrelations",
  selectedPlayerLabel: "Fochizzy",
  metaGames: 7,
  personalRows: [],
  pairingRows: [],
  macroRows: [
    { label: "Contracts / Failures Ratio vs Win Rate", value: 0.51 },
    { label: "Assists Given vs Win Rate", value: -0.18 },
  ],
  turnOrderSummary: null,
  synergyPairs: [],
  players: [],
});

assert.equal(
  macroStatements.length,
  4,
  "expected macro insights summaries to render four short statements"
);
assertUniqueStatements(
  macroStatements,
  "expected macro fallback summaries to avoid duplicate strings"
);
assertStatementsMatch(
  macroStatements,
  [
    /Reading tablewide win patterns\./i,
    /2 macro factors live; top read: Contracts \/ Failures Ratio vs Win Rate at \+0\.51\./i,
    /7 finished games are in sample\./i,
    /No published turn-order interpretation yet\./i,
  ],
  "expected macro summaries to describe the sample, factor count, strongest macro read, and missing turn-order state"
);

const macroTurnOrderStatements = buildInsightSummaryStatements({
  tab: "macroCorrelations",
  selectedPlayerLabel: "Fochizzy",
  metaGames: 11,
  personalRows: [],
  pairingRows: [],
  macroRows: [
    { label: "Contracts / Failures Ratio vs Win Rate", value: 0.51 },
    { label: "Turn Order vs Win Rate", value: 0.31 },
  ],
  turnOrderSummary: {
    totalGames: 7,
    turnOrderWinCorrelation: 0.31,
    summary: "Seat-to-win correlation across 7 finished games.",
    bestSeat: {
      seat: 4,
      label: "Seat 4",
      appearances: 4,
      wins: 3,
      winRate: 0.75,
    },
    worstSeat: {
      seat: 1,
      label: "Seat 1",
      appearances: 5,
      wins: 1,
      winRate: 0.2,
    },
  },
  synergyPairs: [],
  players: [],
});

assert.equal(
  macroTurnOrderStatements.length,
  4,
  "expected turn-order-enhanced macro summaries to keep the four short statements layout"
);
assertStatementsMatch(
  macroTurnOrderStatements,
  [
    /Reading tablewide win patterns\./i,
    /2 macro factors live; top read: Contracts \/ Failures Ratio vs Win Rate at \+0\.51\./i,
    /Seat-to-win correlation across 7 finished games\. Influence: \+0\.31\./i,
    /Best seat: Seat 4 at 75% in 4 starts; lowest: Seat 1 at 20% in 5 starts\./i,
  ],
  "expected turn-order-enhanced macro summaries to mention the strongest macro factor plus the full seat interpretation layer"
);

const macroSameSeatStatements = buildInsightSummaryStatements({
  tab: "macroCorrelations",
  selectedPlayerLabel: "Fochizzy",
  metaGames: 6,
  personalRows: [],
  pairingRows: [],
  macroRows: [
    { label: "Turn Order vs Win Rate", value: 0.12 },
  ],
  turnOrderSummary: {
    totalGames: 6,
    turnOrderWinCorrelation: 0.12,
    summary: "Seat-to-win correlation across 6 finished games.",
    bestSeat: {
      seat: 2,
      label: "Seat 2",
      appearances: 4,
      wins: 2,
      winRate: 0.5,
    },
    worstSeat: {
      seat: 2,
      label: "Seat 2",
      appearances: 4,
      wins: 2,
      winRate: 0.5,
    },
  },
  synergyPairs: [],
  players: [],
});

assertStatementsMatch(
  macroSameSeatStatements,
  [
    /Reading tablewide win patterns\./i,
    /1 macro factor live; top read: Turn Order vs Win Rate at \+0\.12\./i,
    /Seat-to-win correlation across 6 finished games\. Influence: \+0\.12\./i,
    /Turn-order split is flat so far: Seat 2 at 50% in 4 starts\./i,
  ],
  "expected same-seat turn-order summaries to collapse to one sane seat statement"
);
assert.doesNotMatch(
  macroSameSeatStatements[3],
  /Best seat:.*lowest:/i,
  "expected same-seat turn-order summaries to avoid contradictory best-vs-lowest wording"
);

const synergyStatements = buildInsightSummaryStatements({
  tab: "topSynergyPairs",
  selectedPlayerLabel: "Fochizzy",
  metaGames: 12,
  personalRows: [],
  pairingRows: [],
  macroRows: [],
  turnOrderSummary: null,
  synergyPairs: [
    { a: "corey", b: "greg", score: 88 },
    { a: "greg", b: "izzy", score: 77 },
  ],
  players: [
    { id: "corey", name: "Corey" },
    { id: "greg", name: "GregMTG" },
    { id: "izzy", name: "Izzy" },
  ],
});

assert.equal(
  synergyStatements.length,
  4,
  "expected synergy insights summaries to render four short statements"
);
assertStatementsMatch(
  synergyStatements,
  [
    /Ranking repeat pair chemistry\./i,
    /12 finished games are in sample\./i,
    /2 alliance pairs live\./i,
    /Top live pair: Corey \+ GregMTG at 88\./i,
  ],
  "expected synergy summaries to mention the sample, pair count, and top pair"
);

const insightsSource = read(path.join("app", "insights.tsx"));

assert.match(
  insightsSource,
  /buildInsightSummaryStatements/,
  "expected the live insights screen to use the shared insights summary builder"
);

assert.match(
  insightsSource,
  /<View style=\{styles\.summaryList\}>[\s\S]*summaryStatements\.map/,
  "expected the live insights screen to render the summary statements as a compact list"
);

assert.doesNotMatch(
  insightsSource,
  /Published personal correlations and synergy reads from the shared insights payload\.|Published correlation trends and synergy reads from the shared insights payload\.|Showing published insight context for .*\.|Published insights from Supabase\.|Showing published personal correlations for .*\.|The correlation breakdown below is live and stays server-authored so the same trend language can be reused across analytics surfaces\./,
  "expected the old insights helper paragraphs to be removed from the live route"
);

console.log("insights-summary-statements.test.cjs passed");
