const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "index.tsx"),
  "utf8"
);

assert.match(
  source,
  /from "@\/utils\/appRoutes"/,
  "expected the charts hub to import the shared app route helpers for Command navigation"
);

assert.match(
  source,
  /<View style=\{styles\.heroActionRow\}>[\s\S]*label="Back to Command"[\s\S]*router\.push\(APP_ROUTES\.home\)/,
  "expected the charts hub hero actions to include a Back to Command control that routes to the Command page"
);

console.log("chart-command-link.test.cjs passed");
