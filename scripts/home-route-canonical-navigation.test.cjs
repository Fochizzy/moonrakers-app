const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const filesThatNavigateHome = [
  "app/add-players.tsx",
  "app/analytics.tsx",
  "app/auth/callback.tsx",
  "app/charts/[chartKey].tsx",
  "app/charts/compare/index.tsx",
  "app/charts/index.tsx",
  "app/definitions.tsx",
  "app/elo.tsx",
  "app/game-trends.tsx",
  "app/game.tsx",
  "app/history.tsx",
  "app/insights.tsx",
  "app/login.tsx",
  "app/player-profile/[playerId].tsx",
  "app/register.tsx",
  "app/reset-password.tsx",
  "app/stats.tsx",
  "lib/auth/useSharedCloudBootstrap.ts",
  "lib/game-session/useGameSessionController.ts",
];

const rawHomeNavigationPattern =
  /(?:router|args\.router)\.(?:push|replace)\(APP_ROUTES\.home(?:\s+as any)?\)/;

for (const relPath of filesThatNavigateHome) {
  const source = read(relPath);

  assert.doesNotMatch(
    source,
    rawHomeNavigationPattern,
    `expected ${relPath} to avoid raw APP_ROUTES.home navigation so web links do not retain stale query params`,
  );

  assert.match(
    source,
    /buildHomeRoute\(/,
    `expected ${relPath} to use buildHomeRoute() for canonical command navigation`,
  );
}

console.log("home-route-canonical-navigation.test.cjs passed");
