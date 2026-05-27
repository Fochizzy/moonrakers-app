const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const definitionTermSource = read(
  path.join("components", "ui", "DefinitionTermText.tsx"),
);
const statsSource = read(path.join("app", "stats.tsx"));
const eloSource = read(path.join("app", "elo.tsx"));
const playerProfileSource = read(path.join("app", "player-profile", "[playerId].tsx"));
const profileTabsSource = read(
  path.join("components", "player-profile", "PlayerProfileMetricTabs.tsx"),
);
const playerCardSource = read(path.join("components", "ColorPlayerCard.tsx"));
const playstyleSource = read(path.join("components", "stats", "PlaystyleSection.tsx"));
const correlationSource = read(path.join("components", "CorrelationStats.tsx"));
const summarySource = read(path.join("app", "summary.tsx"));

assert.match(
  definitionTermSource,
  /resolveDefinitionTarget\(/,
  "expected the shared inline definition term component to resolve glossary targets",
);

assert.match(
  definitionTermSource,
  /buildDefinitionsRoute\(\{[\s\S]*\.\.\.definitionTarget[\s\S]*sourceLabel:/s,
  "expected the shared inline definition term component to route through the shared definitions helper and preserve source context",
);

assert.match(
  statsSource,
  /DefinitionTermText/,
  "expected Stats to use the shared inline definition term component for visible metric labels",
);

assert.match(
  statsSource,
  /<DefinitionTermText[\s\S]*label=\{label\}/s,
  "expected Stats pills to make glossary-backed labels themselves tappable",
);

assert.match(
  eloSource,
  /DefinitionTermText/,
  "expected ELO metric cards to use the shared inline definition term component",
);

assert.match(
  eloSource,
  /<DefinitionTermText[\s\S]*label=\{featuredCard\.label\}/s,
  "expected the ELO spotlight cards to make their glossary terms tappable",
);

assert.match(
  playerProfileSource,
  /DefinitionTermText/,
  "expected player-profile hero cards to use the shared inline definition term component",
);

assert.match(
  playerProfileSource,
  /<DefinitionTermText[\s\S]*label="Current ELO"[\s\S]*metric="elo_current"/s,
  "expected player-profile Current ELO to tap straight into its definition",
);

assert.match(
  profileTabsSource,
  /DefinitionTermText/,
  "expected shared player-profile metric tabs to use the shared inline definition term component",
);

assert.match(
  profileTabsSource,
  /<DefinitionTermText[\s\S]*label=\{card\.label\}/s,
  "expected player-profile metric tab cards to make glossary-backed labels tappable",
);

assert.match(
  playerCardSource,
  /DefinitionTermText/,
  "expected shared color player cards to use the shared inline definition term component",
);

assert.match(
  playerCardSource,
  /<DefinitionTermText[\s\S]*label=\{label\}/s,
  "expected player-card stat tiles to make glossary-backed labels tappable",
);

assert.match(
  playstyleSource,
  /DefinitionTermText/,
  "expected playstyle summary cards to use the shared inline definition term component",
);

assert.match(
  playstyleSource,
  /<DefinitionTermText[\s\S]*label=\{label\}/s,
  "expected playstyle cards to make glossary-backed labels tappable",
);

assert.match(
  correlationSource,
  /DefinitionTermText/,
  "expected correlation panels to use the shared inline definition term component",
);

assert.match(
  correlationSource,
  /<DefinitionTermText[\s\S]*label=\{item\.label\}/s,
  "expected correlation entries to make glossary-backed terms tappable",
);

assert.match(
  summarySource,
  /DefinitionTermText/,
  "expected summary metric pills to use the shared inline definition term component",
);

assert.match(
  summarySource,
  /<DefinitionTermText[\s\S]*label=\{label\}/s,
  "expected summary metric pills to make glossary-backed labels tappable",
);

console.log("definition-inline-term-links.test.cjs passed");
