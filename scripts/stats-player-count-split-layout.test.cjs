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
  /const hasLeagueData =[\s\S]*playerCountSummaryItems\.length > 0/,
  "expected hasLeagueData to treat table-size summary cards as usable server-authored league data",
);

assert.match(
  statsSource,
  /const hasOverviewServerData =[\s\S]*playerCountMetaItems\.length > 0/,
  "expected app/stats.tsx to derive overview readiness from server-authored overview data including table-size rows",
);

assert.match(
  statsSource,
  /const hasGamesServerData =[\s\S]*playerCountSummaryItems\.length > 0/,
  "expected app/stats.tsx to derive games-tab readiness from server-authored game data including table-size rows",
);

assert.match(
  statsSource,
  /renderOverviewTab[\s\S]*overviewRecoveryState\.kind === "no-games"[\s\S]*!hasOverviewServerData/,
  "expected Overview to stop blindly blocking on no-games when server-authored overview data exists",
);

assert.match(
  statsSource,
  /renderGamesTab[\s\S]*overviewRecoveryState\.kind === "no-games"[\s\S]*!hasGamesServerData/,
  "expected Games to stop blindly blocking on no-games when server-authored game data exists",
);

assert.match(
  statsSource,
  /<Text style=\{styles\.compactSectionTitle\}>By Table Size<\/Text>[\s\S]*playerCountMetaItems\.map/,
  "expected app/stats.tsx to keep rendering the overview By Table Size section",
);

assert.match(
  statsSource,
  /<Text style=\{styles\.compactSectionTitle\}>By Table Size<\/Text>[\s\S]*playerCountSummaryItems\.map/,
  "expected app/stats.tsx to keep rendering the games By Table Size section",
);

console.log("stats-player-count-split-layout.test.cjs passed");
