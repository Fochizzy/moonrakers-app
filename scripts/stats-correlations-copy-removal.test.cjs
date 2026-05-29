const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "stats.tsx"),
  "utf8",
);

assert.match(
  source,
  /title="Correlation feed"/,
  "expected the stats insights tab to keep the Correlation feed card",
);

assert.doesNotMatch(
  source,
  /"These correlation summaries now come from Supabase instead of local derivation\."|"3 stats analyzed across 9 games\."/,
  "expected the Correlation feed card to stop rendering the old summary line",
);

assert.doesNotMatch(
  source,
  /Correlation entries below are served from the Supabase insights payload instead of route-local math\./,
  "expected the Correlation feed card to stop rendering the Supabase source-caption explainer copy",
);

console.log("stats-correlations-copy-removal.test.cjs passed");
