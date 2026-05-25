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
  /<TouchableOpacity style=\{styles\.navPill\} onPress=\{\(\) => router\.push\(APP_ROUTES\.home\)\} activeOpacity=\{0\.9\}>[\s\S]*Back to Command[\s\S]*<\/TouchableOpacity>/,
  "expected the top-left nav pill to route to Command and display Back to Command"
);

assert.doesNotMatch(
  source,
  /<Text style=\{styles\.navPillText\}>Home<\/Text>/,
  "expected the old Home nav label to be removed from the conditional affect screen"
);

console.log("chart-compare-command-link.test.cjs passed");
