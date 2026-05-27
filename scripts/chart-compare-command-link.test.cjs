const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "compare", "index.tsx"),
  "utf8"
);

assert.match(
  source,
  /from "@\/utils\/appRoutes"/,
  "expected the conditional affect screen to import the shared app route helpers for Command navigation"
);

assert.match(
  source,
  /<HeroCard[\s\S]*headerAction=\{[\s\S]*<ActionButton[\s\S]*title="Command"[\s\S]*onPress=\{\(\) => router\.push\(APP_ROUTES\.home\)\}[\s\S]*style=\{styles\.heroActionButton\}[\s\S]*\/>[\s\S]*\}/,
  "expected the compare hero to route to Command and display Command in the header action"
);

assert.doesNotMatch(
  source,
  /title="Home"/,
  "expected the old Home nav label to be removed from the compare screen"
);

console.log("chart-compare-command-link.test.cjs passed");
