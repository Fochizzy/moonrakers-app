const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "stats.tsx"),
  "utf8"
);

assert.match(
  source,
  /from "expo-router"/,
  "expected the stats screen to import expo-router for Command navigation"
);

assert.match(
  source,
  /from "@\/utils\/appRoutes"/,
  "expected the stats screen to import the shared app route helpers for Command navigation"
);

assert.match(
  source,
  /<View style=\{styles\.heroHeader\}>[\s\S]*<View style=\{styles\.heroTitleWrap\}>[\s\S]*Mission Snapshot[\s\S]*router\.push\(APP_ROUTES\.home\)[\s\S]*Back to Command[\s\S]*<\/View>/,
  "expected the stats hero to include a top-right Back to Command control beside the mission snapshot title block"
);

assert.match(
  source,
  /heroHeader:\s*\{[\s\S]*flexDirection:\s*"row",[\s\S]*justifyContent:\s*"space-between",/,
  "expected the stats hero header to lay out the title block and Back to Command button across the top row"
);

console.log("stats-command-link.test.cjs passed");
