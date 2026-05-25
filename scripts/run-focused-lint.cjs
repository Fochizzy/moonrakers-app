const { spawnSync } = require("node:child_process");
const path = require("node:path");

const eslintBin = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "eslint",
  "bin",
  "eslint.js",
);

const focusedFiles = [
  "app/add-players.tsx",
  "app/analytics.tsx",
  "app/charts/[chartKey].tsx",
  "app/elo.tsx",
  "app/game-trends.tsx",
  "app/game.tsx",
  "app/insights.tsx",
  "app/player-cards.tsx",
  "app/player-profile/[playerId].tsx",
  "app/player-profile/index.tsx",
  "app/stats.tsx",
  "app/summary.tsx",
  "components/ColorPlayerCard.tsx",
  "components/analytics/AnalyticsRecoveryCard.tsx",
  "components/analytics/AnalyticsSourceBadge.tsx",
  "components/analytics/AnalyticsStateSection.tsx",
  "components/home/HomeLeaderboardTab.tsx",
  "components/player/MoonrakersIntelSection.tsx",
  "utils/gameScreenTheme.ts",
  "utils/playerCardElo.ts",
];

const args = [
  eslintBin,
  ...focusedFiles,
  "--ext",
  ".ts,.tsx",
  "--rule",
  "@typescript-eslint/no-explicit-any: off",
  "--rule",
  "@typescript-eslint/no-require-imports: off",
];

const result = spawnSync(process.execPath, args, {
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("run-focused-lint.cjs passed");
