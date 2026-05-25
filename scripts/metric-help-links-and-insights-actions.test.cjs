const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  const fullPath = path.join(projectRoot, relPath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

const helpLinkSource = read(path.join("components", "ui", "DefinitionsJumpLink.tsx"));
const insightsSource = read(path.join("app", "insights.tsx"));
const statsSource = read(path.join("app", "stats.tsx"));
const eloSource = read(path.join("app", "elo.tsx"));
const profileSource = read(path.join("app", "player-profile", "[playerId].tsx"));

assert.match(
  helpLinkSource,
  /buildDefinitionsRoute/,
  "expected a shared Definitions jump-link component to route through the shared helper",
);

assert.match(
  helpLinkSource,
  /metric\?: string \| null/,
  "expected the shared Definitions jump-link component to support metric targets",
);

assert.match(
  helpLinkSource,
  /category\?: string \| null/,
  "expected the shared Definitions jump-link component to support category targets",
);

assert.match(
  insightsSource,
  /buildCompareRoute/,
  "expected Insights to use the shared compare route builder for player-aware actions",
);

assert.match(
  insightsSource,
  /buildChartsRoute/,
  "expected Insights to use the shared charts route builder for player-aware actions",
);

assert.match(
  insightsSource,
  /buildPlayerProfileRoute/,
  "expected Insights to use the shared player profile route builder for player-aware actions",
);

assert.match(
  insightsSource,
  /DefinitionsJumpLink/,
  "expected Insights to expose a shared Definitions jump-out for correlation sections",
);

assert.match(
  insightsSource,
  /Open compare for this player/,
  "expected Insights to expose a player-aware compare action",
);

assert.match(
  insightsSource,
  /Open scoped charts/,
  "expected Insights to expose a player-aware charts action",
);

assert.match(
  insightsSource,
  /View profile/,
  "expected Insights to expose a player-aware profile action",
);

assert.match(
  insightsSource,
  /buildCompareRoute\(\{[\s\S]*mode:\s*"players"[\s\S]*ids:\s*\[activeProfileId\]/s,
  "expected Insights compare actions to lock the selected player into the compare route",
);

assert.match(
  insightsSource,
  /buildChartsRoute\(\{[\s\S]*playerId:\s*activeProfileId[\s\S]*setup:\s*true[\s\S]*\}\)/s,
  "expected Insights chart actions to open scoped chart setup for the selected player",
);

assert.match(
  insightsSource,
  /buildPlayerProfileRoute\(activeProfileId\)/,
  "expected Insights profile actions to open the selected player's detail route",
);

assert.match(
  insightsSource,
  /<DefinitionsJumpLink[\s\S]*category="correlations"/s,
  "expected Insights help links to target the correlations Definitions category",
);

assert.match(
  statsSource,
  /DefinitionsJumpLink/,
  "expected Stats to expose shared Definitions jump-outs on interpretation-heavy sections",
);

assert.match(
  statsSource,
  /<DefinitionsJumpLink[\s\S]*category="scoring"/s,
  "expected Stats overview help to target the scoring Definitions category",
);

assert.match(
  statsSource,
  /<DefinitionsJumpLink[\s\S]*category="efficiency"/s,
  "expected Stats player-detail and playstyle help to target the efficiency Definitions category",
);

assert.match(
  statsSource,
  /<DefinitionsJumpLink[\s\S]*category="correlations"/s,
  "expected Stats correlation help to target the correlations Definitions category",
);

assert.match(
  eloSource,
  /DefinitionsJumpLink/,
  "expected ELO to expose Definitions jump-outs for headline and section metrics",
);

assert.match(
  eloSource,
  /<DefinitionsJumpLink[\s\S]*metric="elo_current"/s,
  "expected ELO to deep-link the Current ELO headline card to its definition",
);

assert.match(
  eloSource,
  /<DefinitionsJumpLink[\s\S]*metric="elo_peak"/s,
  "expected ELO to deep-link the Peak headline card to its definition",
);

assert.match(
  eloSource,
  /<DefinitionsJumpLink[\s\S]*category="elo"/s,
  "expected ELO section help to target the ELO Definitions category",
);

assert.match(
  profileSource,
  /DefinitionsJumpLink/,
  "expected player profile sections to expose Definitions jump-outs for ELO-heavy sections",
);

assert.match(
  profileSource,
  /<DefinitionsJumpLink[\s\S]*metric="elo_current"/s,
  "expected player profile to deep-link its Current ELO card to Definitions",
);

assert.match(
  profileSource,
  /<DefinitionsJumpLink[\s\S]*metric="elo_peak"/s,
  "expected player profile to deep-link its Peak card to Definitions",
);

assert.match(
  profileSource,
  /<DefinitionsJumpLink[\s\S]*category="elo"/s,
  "expected player profile section help to target the ELO Definitions category",
);

console.log("metric-help-links-and-insights-actions.test.cjs passed");
