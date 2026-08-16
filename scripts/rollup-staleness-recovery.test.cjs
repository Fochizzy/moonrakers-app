const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(projectRoot, ...parts), "utf8");
}

// A stale rollup used to be repairable only once per app session: a finish-game
// refresh that failed AFTER that run left analytics stale until the app was
// killed. Two triggers close that window and this guard pins both.

const reconcileSource = read("lib", "cloud", "analytics", "reconcileStaleRollup.ts");

assert.match(
  reconcileSource,
  /export function markRollupPossiblyStale\(\)/,
  "expected a way to clear the once-per-session reconcile guard after a failed refresh",
);

assert.match(
  reconcileSource,
  /export function reconcileStaleRollupOnForeground\(\)/,
  "expected a foreground re-check entry point for long-lived app sessions",
);

assert.match(
  reconcileSource,
  /FOREGROUND_RECHECK_INTERVAL_MS/,
  "expected the foreground re-check to be throttled rather than firing on every activation",
);

const controllerSource = read("lib", "game-session", "useGameSessionController.ts");

assert.match(
  controllerSource,
  /catch \(refreshError\) \{[\s\S]*?markRollupPossiblyStale\(\);/,
  "expected a failed finish-game refresh to mark the rollup stale for the next analytics load",
);

const layoutSource = read("app", "_layout.tsx");

assert.match(
  layoutSource,
  /AppState\.addEventListener\("change",[\s\S]*?state === "active"[\s\S]*?reconcileStaleRollupOnForeground\(\)/,
  "expected returning to the foreground to re-check rollup staleness",
);

console.log("rollup-staleness-recovery.test.cjs passed");
