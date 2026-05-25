const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "insights.tsx"),
  "utf8",
);

assert.match(
  source,
  /from "@\/utils\/appRoutes"/,
  "expected the insights route to import the shared app route helpers for Command navigation",
);

assert.match(
  source,
  /<View style=\{styles\.heroHeader\}>[\s\S]*<Text style=\{styles\.title\}>Insights Hub<\/Text>[\s\S]*router\.push\(APP_ROUTES\.home\)[\s\S]*Back to Command/,
  "expected the Insights hero header to include a top-right Back to Command control",
);

assert.match(
  source,
  /heroHeader:\s*\{[\s\S]*flexDirection:\s*"row",[\s\S]*justifyContent:\s*"space-between",/,
  "expected the insights hero header to lay out the title and Back to Command button across the top row",
);

console.log("insights-command-link.test.cjs passed");
