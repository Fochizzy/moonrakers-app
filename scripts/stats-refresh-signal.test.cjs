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
  /from "@\/utils\/formatters"/,
  "expected the stats screen to use the shared date formatter for refresh metadata",
);

assert.match(
  source,
  /function formatGeneratedAtValue[\s\S]*formatDate\(/,
  "expected the stats screen to normalize generatedAt values through the shared date formatter",
);

assert.match(
  source,
  /function normalizeTopSignals[\s\S]*refresh-status[\s\S]*Last refreshed/,
  "expected the stats screen to rewrite the refresh-status placeholder into a Last refreshed timestamp",
);

console.log("stats-refresh-signal.test.cjs passed");
