const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "stats.tsx"),
  "utf8"
);

assert.doesNotMatch(
  source,
  /Any game-level summaries on this screen now come from Supabase\./,
  "expected the Games tab to remove the Supabase helper subtitle copy"
);

assert.doesNotMatch(
  source,
  /This game summary is published from Supabase so it stays aligned with the other analytics hubs\./,
  "expected the Games tab to remove the Supabase helper source caption copy"
);

console.log("stats-games-helper-copy.test.cjs passed");
