const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const definitionsSource = fs.readFileSync(
  path.join(__dirname, "..", "app", "definitions.tsx"),
  "utf8",
);
const catalogSource = fs.readFileSync(
  path.join(__dirname, "..", "utils", "definitionCatalog.ts"),
  "utf8",
);

assert.match(
  definitionsSource,
  /DEFINITION_GROUPS/,
  "expected the Definitions screen to read from the shared definition catalog",
);

for (const snippet of [
  'key: "elo"',
  'title: "ELO"',
  'key: "correlations"',
  'title: "Correlations"',
  'key: "intel"',
  'title: "Moonrakers Intel"',
  'key: "games"',
  'title: "Games Played"',
  'key: "winRate"',
  'title: "Win Rate"',
  'key: "allContractsEfficiency"',
  'title: "Overall Efficiency"',
  'key: "tempoControl"',
  'title: "Tempo Control"',
  'key: "trajectoryGrade"',
  'title: "Trajectory Grade"',
  'key: "elo_current"',
  'title: "Current ELO"',
  'key: "promotionOdds"',
  'title: "Promotion Odds"',
  'key: "pairingCorrelations"',
  'title: "Personal Correlations"',
  'key: "macroCorrelations"',
  'title: "Macro Correlations"',
  'key: "topSynergyPairs"',
  'title: "Top Synergy Pairs"',
  'key: "styleRead"',
  'title: "Style Read"',
  'key: "supportStyle"',
  'title: "Support Style"',
  'key: "importHealth"',
  'title: "Import Health"',
  'key: "aggressor"',
  'title: "Aggressor"',
  'key: "supportEngine"',
  'title: "Support Engine"',
  'key: "opportunist"',
  'title: "Opportunist"',
  'key: "closer"',
  'title: "Closer"',
]) {
  assert.ok(
    catalogSource.includes(snippet),
    `expected definitionCatalog.ts to contain ${snippet}`,
  );
}

console.log("definitions-glossary-coverage.test.cjs passed");
