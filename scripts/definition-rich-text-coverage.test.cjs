const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const richTextSource = read(path.join("components", "ui", "DefinitionRichText.tsx"));
const heroCardSource = read(path.join("components", "ui", "HeroCard.tsx"));
const sectionCardSource = read(path.join("components", "ui", "SectionCard.tsx"));
const hubTileCardSource = read(path.join("components", "ui", "HubTileCard.tsx"));
const insightsPanelSource = read(path.join("components", "insights", "InsightsSectionPanel.tsx"));
const insightsSource = read(path.join("app", "insights.tsx"));
const analyticsSource = read(path.join("app", "analytics.tsx"));
const playerCardsSource = read(path.join("app", "player-cards.tsx"));
const homeSource = read(path.join("app", "index.tsx"));
const intelSource = read(path.join("components", "player", "MoonrakersIntelSection.tsx"));

assert.match(
  richTextSource,
  /onLongPress/,
  "expected the shared rich-text glossary component to support long-press previews for inline narrative terms",
);

assert.match(
  richTextSource,
  /findDefinitionTextSegments/,
  "expected the shared rich-text glossary component to tokenize narrative copy against the glossary catalog",
);

assert.match(
  heroCardSource,
  /DefinitionRichText/,
  "expected HeroCard to render subtitle text through the shared glossary-aware rich-text component",
);

assert.match(
  sectionCardSource,
  /DefinitionRichText/,
  "expected SectionCard headers to render subtitle text through the shared glossary-aware rich-text component",
);

assert.match(
  hubTileCardSource,
  /DefinitionRichText/,
  "expected HubTileCard titles or descriptions to become glossary-aware on the home and players hubs",
);

assert.match(
  insightsPanelSource,
  /DefinitionRichText/,
  "expected insight section panels to render narrative copy through the shared glossary-aware rich-text component",
);

assert.match(
  insightsSource,
  /DefinitionRichText/,
  "expected the Insights screen summary statements to use glossary-aware rich text",
);

assert.match(
  analyticsSource,
  /DefinitionTermText|DefinitionRichText/,
  "expected the analytics destination hub to expose glossary-aware term links on its cards",
);

assert.match(
  playerCardsSource,
  /DefinitionRichText|DefinitionTermText/,
  "expected the player-cards screen to expose glossary-aware terms beyond its category jump links",
);

assert.match(
  homeSource,
  /HubTileCard/,
  "expected the home screen hub tiles to inherit glossary-aware card rendering",
);

assert.match(
  intelSource,
  /DefinitionRichText/,
  "expected Moonrakers Intel narrative copy to render glossary-aware inline terms",
);

console.log("definition-rich-text-coverage.test.cjs passed");
