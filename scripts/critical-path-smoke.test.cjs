const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const packageJson = JSON.parse(
  read("package.json"),
);

assert.equal(
  typeof packageJson.scripts?.["test:critical-path"],
  "string",
  "expected package.json to expose a critical-path smoke verification script",
);

const smokeSource = fs.readFileSync(
  path.join(projectRoot, "scripts", "critical-path-smoke.test.cjs"),
  "utf8",
);

for (const requiredRoute of [
  "app/_layout.tsx",
  "app/add-players.tsx",
  "app/game-setup.tsx",
  "app/game.tsx",
  "app/history.tsx",
  "app/player-profile/[playerId].tsx",
  "app/charts/[chartKey].tsx",
]) {
  assert.match(
    smokeSource,
    new RegExp(requiredRoute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `expected the critical-path smoke guard to cover ${requiredRoute}`,
  );
}

assert.match(
  read(path.join("app", "_layout.tsx")),
  /useSharedCloudBootstrap/,
  "expected app/_layout.tsx to delegate auth and cloud hydration bootstrap to the shared bootstrap hook",
);

assert.match(
  read(path.join("app", "game.tsx")),
  /useGameSessionController/,
  "expected app/game.tsx to delegate finish-game orchestration to the shared game session controller",
);

assert.match(
  read(path.join("app", "history.tsx")),
  /useHistoryDataManager/,
  "expected app/history.tsx to delegate history import and delete orchestration to the shared history data manager",
);

assert.match(
  read(path.join("app", "charts", "[chartKey].tsx")),
  /resolveChartDetailProvenance/,
  "expected app/charts/[chartKey].tsx to use the shared chart provenance model",
);

assert.match(
  read(path.join("app", "charts", "compare", "index.tsx")),
  /ChartSurface|ChartMetricChip|ChartInsightStrip/,
  "expected compare surfaces to use the extracted chart surface primitives",
);

assert.match(
  read(path.join("app", "player-profile", "[playerId].tsx")),
  /getPlayerProfileScreen/,
  "expected the player profile to remain wired to the server-authored screen contract",
);

console.log("critical-path-smoke.test.cjs passed");
