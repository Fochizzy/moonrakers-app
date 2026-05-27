const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function escapeForRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const presentationHookSource = readProjectFile("utils/useAnalyticsPresentation.ts");

assert.match(
  presentationHookSource,
  /export function useAnalyticsPresentation\(/,
  "expected a shared useAnalyticsPresentation hook",
);

assert.match(
  presentationHookSource,
  /formatSupabaseConfigError/,
  "expected the shared presentation hook to centralize Supabase error formatting",
);

assert.match(
  presentationHookSource,
  /buildAnalyticsFreshnessPresentation/,
  "expected the shared presentation hook to centralize analytics freshness presentation",
);

for (const [relativePath, fallbackMessage] of [
  ["app/analytics.tsx", "Failed to load analytics."],
  ["app/stats.tsx", "Failed to load stats."],
  ["app/insights.tsx", "Failed to load insights."],
  ["app/elo.tsx", "Failed to load ELO."],
  ["app/charts/index.tsx", "Failed to load chart setup."],
]) {
  const source = readProjectFile(relativePath);

  assert.match(
    source,
    /useAnalyticsPresentation/,
    `${relativePath} should use the shared analytics presentation hook`,
  );
  assert.match(
    source,
    new RegExp(
      `fallbackMessage:\\s*"${escapeForRegex(fallbackMessage)}"`,
    ),
    `${relativePath} should declare the shared fallback message for analytics presentation`,
  );
  assert.doesNotMatch(
    source,
    /const\s*\[\s*error\s*,\s*setError\s*\]/,
    `${relativePath} should stop keeping route-local formatted error state`,
  );
  assert.doesNotMatch(
    source,
    /formatSupabaseConfigError/,
    `${relativePath} should stop formatting analytics query errors inline`,
  );
}

for (const [relativePath, setterName, fallbackMessage] of [
  ["app/charts/[chartKey].tsx", "setError", "Failed to load chart."],
]) {
  const source = readProjectFile(relativePath);

  assert.match(
    source,
    /formatSupabaseConfigError/,
    `${relativePath} should continue formatting its route-specific chart errors`,
  );
  assert.match(
    source,
    new RegExp(
      `${setterName}\\(\\s*formatSupabaseConfigError\\(nextError\\)\\s*\\|\\|\\s*"${escapeForRegex(fallbackMessage)}"\\s*,?\\s*\\)`,
    ),
    `${relativePath} should preserve route-specific chart error fallbacks`,
  );
}

console.log("analytics-screen-error-formatting.test.cjs passed");
