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
const liveQueryPath = path.join("lib", "cloud", "analytics", "useLiveAnalyticsQuery.ts");
const liveQuerySource = read(liveQueryPath);

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

assert.match(
  liveQuerySource,
  /useAnalyticsRefreshTick/,
  "expected the shared live analytics query helper to subscribe to the analytics refresh hook",
);

assert.match(
  liveQuerySource,
  /const\s+analyticsRefreshTick\s*=\s*useAnalyticsRefreshTick\(\);/,
  "expected the shared live analytics query helper to create a refresh tick",
);

assert.match(
  liveQuerySource,
  /analyticsRefreshTick/,
  "expected the shared live analytics query helper to use the refresh tick in its loading flow",
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
    /useLiveAnalyticsQuery/,
    `expected ${relPath} to load analytics through the shared live analytics query helper`,
  );

  assert.match(
    source,
    /useLiveAnalyticsQuery\s*\(/,
    `expected ${relPath} to create analytics state through the shared live analytics query helper`,
  );

  assert.match(
    source,
    /queryKey:/,
    `expected ${relPath} to provide a stable analytics query key to the shared live analytics query helper`,
  );
}

console.log("analytics-focus-refresh.test.cjs passed");
