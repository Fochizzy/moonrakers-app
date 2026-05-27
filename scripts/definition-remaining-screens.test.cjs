const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const sectionCardSource = read(path.join("components", "ui", "SectionCard.tsx"));
const heroCardSource = read(path.join("components", "ui", "HeroCard.tsx"));
const analyticsSource = read(path.join("app", "analytics.tsx"));
const homeLeaderboardSource = read(
  path.join("components", "home", "HomeLeaderboardTab.tsx"),
);
const gameTrendsSource = read(path.join("app", "game-trends.tsx"));
const compareInsightSource = read(
  path.join("components", "charts", "compare", "CompareInsightBar.tsx"),
);
const conditionalCompareSource = read(
  path.join("components", "charts", "compare", "ConditionalComparisonCard.tsx"),
);

assert.match(
  sectionCardSource,
  /<DefinitionRichText text=\{eyebrow\} variant="eyebrow" \/>/,
  "expected SectionCard eyebrow labels to render through glossary-aware rich text",
);

assert.match(
  heroCardSource,
  /<DefinitionRichText text=\{eyebrow\} variant="eyebrow" \/>/,
  "expected HeroCard eyebrow labels to render through glossary-aware rich text",
);

assert.match(
  analyticsSource,
  /DefinitionsJumpLink/,
  "expected analytics destination cards to expose a glossary jump link without changing the plain title styling",
);

assert.match(
  homeLeaderboardSource,
  /DefinitionRichText/,
  "expected the home leaderboard to render glossary-backed metric copy through the shared rich-text component",
);

assert.match(
  homeLeaderboardSource,
  /Games Played|Prestige \/ Game|Total Prestige/,
  "expected the home leaderboard metric copy to use glossary-resolvable labels",
);

assert.match(
  gameTrendsSource,
  /DefinitionTermText/,
  "expected game-trends stat tags to expose glossary-backed metric labels",
);

assert.match(
  gameTrendsSource,
  /metric="directPrestige"|metric="assistPrestigeReceived"|metric="score"|metric="totalPrestige"/,
  "expected game-trends tags to map their metric labels to shared glossary targets",
);

assert.match(
  compareInsightSource,
  /DefinitionRichText/,
  "expected compare insight summaries to render narrative glossary terms through rich text",
);

assert.match(
  compareInsightSource,
  /<DefinitionRichText[\s\S]*text=\{line\}/s,
  "expected compare insight summary lines to render through glossary-aware rich text",
);

assert.match(
  conditionalCompareSource,
  /DefinitionTermText/,
  "expected conditional compare metric labels to use the shared glossary term component",
);

assert.match(
  conditionalCompareSource,
  /DefinitionRichText/,
  "expected conditional compare summary copy to render through glossary-aware rich text",
);

assert.match(
  conditionalCompareSource,
  /metric="winRate"|metric="avgPrestigePerGame"|metric="avgScorePerGame"|metric="synergyIndex"/,
  "expected conditional compare labels to map core metrics to shared glossary targets",
);

console.log("definition-remaining-screens.test.cjs passed");
