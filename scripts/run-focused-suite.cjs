const { spawnSync } = require("node:child_process");
const path = require("node:path");

const suites = {
  analytics: [
    "scripts/analytics-shared-state-shell.test.cjs",
    "scripts/analytics-provenance-fallback.test.cjs",
    "scripts/playstyle-spotlight-definitions.test.cjs",
    "scripts/player-card-elo-helper.test.cjs",
  ],
  ui: [
    "scripts/game-trends-visual-system.test.cjs",
    "scripts/player-directory-visual-system.test.cjs",
    "scripts/game-flow-shell-upgrades.test.cjs",
    "scripts/legacy-cleanup-guards.test.cjs",
    "scripts/chart-guided-rail-model.test.cjs",
    "scripts/chart-guided-rail-structure.test.cjs",
    "scripts/chart-guided-rail-route.test.cjs",
    "scripts/chart-setup-primary-cta.test.cjs",
    "scripts/chart-setup-back-pill.test.cjs",
  ],
};

const suiteName = process.argv[2];
const files = suites[suiteName];

if (!files) {
  console.error(
    `Unknown suite "${suiteName}". Expected one of: ${Object.keys(suites).join(", ")}`,
  );
  process.exit(1);
}

for (const relPath of files) {
  const result = spawnSync(process.execPath, [path.resolve(relPath)], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`run-focused-suite.cjs passed (${suiteName})`);
