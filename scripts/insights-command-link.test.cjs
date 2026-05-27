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
  /<HeroCard[\s\S]*headerAction=\{[\s\S]*<ActionButton[\s\S]*title="Command"[\s\S]*onPress=\{\(\) => router\.push\(APP_ROUTES\.home\)\}[\s\S]*style=\{styles\.heroActionButton\}/,
  "expected the Insights hero to include a Command header action wired to the shared Command route",
);

console.log("insights-command-link.test.cjs passed");
