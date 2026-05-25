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

for (const [relativePath, setterName, fallbackMessage] of [
  ["app/analytics.tsx", "setError", "Failed to load analytics."],
  ["app/stats.tsx", "setError", "Failed to load stats."],
  ["app/insights.tsx", "setError", "Failed to load insights."],
  ["app/charts/index.tsx", "setSetupError", "Failed to load chart setup."],
  ["app/charts/[chartKey].tsx", "setError", "Failed to load chart."],
]) {
  const source = readProjectFile(relativePath);

  assert.match(
    source,
    /formatSupabaseConfigError/,
    `${relativePath} should use formatSupabaseConfigError for analytics RPC failures`,
  );
  assert.match(
    source,
    new RegExp(
      `${setterName}\\(\\s*formatSupabaseConfigError\\(nextError\\)\\s*\\|\\|\\s*"${escapeForRegex(fallbackMessage)}"\\s*,?\\s*\\)`,
    ),
    `${relativePath} should format Supabase errors before falling back to ${fallbackMessage}`,
  );
}

console.log("analytics-screen-error-formatting.test.cjs passed");
