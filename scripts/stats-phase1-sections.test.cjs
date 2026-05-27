const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const statsSource = read(path.join("app", "stats.tsx"));
const turnOrderSectionPath = path.join(
  projectRoot,
  "components",
  "stats",
  "TurnOrderSummarySection.tsx",
);

assert.match(
  statsSource,
  /import TurnOrderSummarySection from "@\/components\/stats\/TurnOrderSummarySection";/,
  "expected stats.tsx to import the shared TurnOrderSummarySection",
);

assert.match(
  statsSource,
  /const overviewFormClosing = toRecord\(overview\.formClosing\);/,
  "expected stats.tsx to read the server-authored overview.formClosing cluster",
);

assert.match(
  statsSource,
  /Form & Closing/,
  "expected the overview tab to surface a Form & Closing subsection",
);

assert.match(
  statsSource,
  /const pressureContext = toRecord\(selectedPlayerDetail\.pressureContext\);/,
  "expected stats.tsx to read the selected-player pressureContext cluster",
);

assert.match(
  statsSource,
  /Pressure & Context/,
  "expected the player detail card to surface a Pressure & Context subsection",
);

assert.match(
  statsSource,
  /const supportContextHighlight = [\s\S]*pressureContext[\s\S]*highlightKey[\s\S]*metrics/,
  "expected the playstyle tab to reuse the highlighted pressure-context metric for support spotlight copy",
);

assert.match(
  statsSource,
  /Support Context Spotlight|Support Context/,
  "expected the playstyle tab to expose a support-context spotlight surface",
);

assert.match(
  statsSource,
  /const turnOrderOverviewRows = toArray\(gamesSection\.turnOrderOverview\);/,
  "expected stats.tsx to read games.turnOrderOverview from the server payload",
);

assert.match(
  statsSource,
  /const turnOrderByTableSize = toArray\(gamesSection\.turnOrderByTableSize\);/,
  "expected stats.tsx to read games.turnOrderByTableSize from the server payload",
);

assert.match(
  statsSource,
  /<TurnOrderSummarySection[\s\S]*overviewRows=\{turnOrderOverviewRows\}[\s\S]*tableSizeGroups=\{turnOrderByTableSize\}[\s\S]*\/>/,
  "expected the games tab to render TurnOrderSummarySection with both server-authored turn-order payload slices",
);

assert.equal(
  fs.existsSync(turnOrderSectionPath),
  true,
  "expected the shared TurnOrderSummarySection component to exist",
);

const turnOrderSectionSource = read(path.join("components", "stats", "TurnOrderSummarySection.tsx"));

assert.match(
  turnOrderSectionSource,
  /Turn Order Overview/,
  "expected the shared turn-order component to label the overview section",
);

assert.match(
  turnOrderSectionSource,
  /By Table Size/,
  "expected the shared turn-order component to label the by-table-size section",
);

assert.match(
  turnOrderSectionSource,
  /DefinitionTermText/,
  "expected the shared turn-order component to keep glossary-friendly labels in play",
);

console.log("stats-phase1-sections.test.cjs passed");
