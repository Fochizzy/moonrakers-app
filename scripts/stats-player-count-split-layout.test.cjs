const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const statsSource = read(path.join("app", "stats.tsx"));
const helperSource = read(path.join("lib", "cloud", "analytics", "statsScreenDisplay.ts"));

assert.match(
  helperSource,
  /"2-player"/,
  "expected the player-count split helper to preserve a dedicated 2-player bucket label",
);

assert.match(
  helperSource,
  /"3\+ players"/,
  "expected the player-count split helper to aggregate multiplayer rows under a 3+ players label",
);

assert.match(
  statsSource,
  /normalizeStatsPlayerCountOverviewRows[\s\S]*normalizeStatsPlayerCountSummaryRows/,
  "expected app/stats.tsx to import the player-count split display helpers",
);

assert.match(
  statsSource,
  /groupMeta\.playerCountSplit/,
  "expected app/stats.tsx to source table-size split summaries from groupMeta.playerCountSplit",
);

assert.match(
  statsSource,
  /<Text style=\{styles\.compactSectionTitle\}>By Table Size<\/Text>/,
  "expected app/stats.tsx to render a By Table Size summary section",
);

assert.match(
  statsSource,
  /playerCountMetaItems\.map[\s\S]*playerCountSummaryItems\.map/,
  "expected app/stats.tsx to render both overview and games-tab table-size split cards",
);

console.log("stats-player-count-split-layout.test.cjs passed");
