const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const helperPath = path.join("lib", "cloud", "analytics", "useAnalyticsRefreshTick.ts");
const helperExists = fs.existsSync(path.join(projectRoot, helperPath));

assert.ok(
  helperExists,
  "expected a shared analytics refresh hook for focus and app-resume retries",
);

const helperSource = read(helperPath);

assert.match(
  helperSource,
  /useFocusEffect/,
  "expected the analytics refresh hook to refetch when a route regains focus",
);

assert.match(
  helperSource,
  /AppState\.addEventListener\(\s*["']change["']/,
  "expected the analytics refresh hook to refetch when the app becomes active again",
);

for (const relPath of [
  path.join("app", "analytics.tsx"),
  path.join("app", "stats.tsx"),
  path.join("app", "insights.tsx"),
  path.join("app", "charts", "index.tsx"),
  path.join("app", "charts", "[chartKey].tsx"),
]) {
  const source = read(relPath);

  assert.match(
    source,
    /useAnalyticsRefreshTick/,
    `expected ${relPath} to import the shared analytics refresh hook`,
  );

  assert.match(
    source,
    /const\s+analyticsRefreshTick\s*=\s*useAnalyticsRefreshTick\(\);/,
    `expected ${relPath} to create a refresh tick from the shared analytics refresh hook`,
  );

  assert.match(
    source,
    /analyticsRefreshTick/,
    `expected ${relPath} to use the refresh tick in its analytics loading flow`,
  );
}

console.log("analytics-focus-refresh.test.cjs passed");
