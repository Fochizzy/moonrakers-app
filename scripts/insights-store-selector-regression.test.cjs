const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "insights.tsx"),
  "utf8"
);
const legacySource = fs.readFileSync(
  path.join(projectRoot, "components", "InsightsScreen.tsx"),
  "utf8"
);

assert.doesNotMatch(
  source,
  /const\s+store\s*=\s*useStore\s*\(\s*\)/,
  "expected app/insights.tsx to avoid subscribing to the entire Zustand store"
);

assert.match(
  source,
  /const\s+games\s*=\s*useStore\(/,
  "expected app/insights.tsx to subscribe to the games slice directly"
);

assert.doesNotMatch(
  source,
  /buildAnalyticsPlayerDirectory\(/,
  "expected app/insights.tsx to stop rebuilding the insights player directory from local analytics state"
);

assert.doesNotMatch(
  source,
  /\bimportedGames\b/,
  "expected app/insights.tsx to avoid the nonexistent importedGames slice because imported history is already merged into games"
);

assert.doesNotMatch(
  legacySource,
  /\bimportedGames\b/,
  "expected components/InsightsScreen.tsx to avoid the nonexistent importedGames slice because imported history is already merged into games"
);

assert.doesNotMatch(
  legacySource,
  /\brelationships\b\s*=\s*useStore\(/,
  "expected components/InsightsScreen.tsx to avoid the nonexistent relationships slice"
);

console.log("insights-store-selector-regression.test.cjs passed");
