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
assert.match(
  personalStatements.join("\n"),
  /Personal focus: Fochizzy|9 finished games|Corey|0\.71/i,
  "expected personal summaries to mention the focus player, sample size, and strongest partner read"
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
  synergyPairs: [],
  players: [],
});

assert.equal(
  macroStatements.length,
  4,
  "expected macro insights summaries to render four short statements"
);
assert.match(
  macroStatements.join("\n"),
  /Reading tablewide win patterns|7 finished games|2 macro factors live|0\.51/i,
  "expected macro summaries to describe the sample, factor count, and strongest macro read"
);

const synergyStatements = buildInsightSummaryStatements({
  tab: "topSynergyPairs",
  selectedPlayerLabel: "Fochizzy",
  metaGames: 12,
  personalRows: [],
  pairingRows: [],
  macroRows: [],
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
assert.match(
  synergyStatements.join("\n"),
  /Ranking repeat pair chemistry|12 finished games|2 alliance pairs live|Corey \+ GregMTG|88/i,
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
