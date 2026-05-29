const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const definitionsSource = fs.readFileSync(
  path.join(projectRoot, "app", "definitions.tsx"),
  "utf8",
);

assert.match(
  definitionsSource,
  /const SORTED_DEFINITION_GROUPS = \[\.\.\.DEFINITION_GROUPS\]\.sort\(/,
  "expected the Definitions screen to create a sorted copy of the shared definition groups",
);

assert.match(
  definitionsSource,
  /left\.title\.localeCompare\(right\.title,\s*undefined,\s*\{[\s\S]*numeric:\s*true,[\s\S]*sensitivity:\s*"base"[\s\S]*\}\)/,
  "expected the Definitions screen to alphabetize groups by title with the shared locale-aware sort behavior",
);

assert.match(
  definitionsSource,
  /return SORTED_DEFINITION_GROUPS\.filter\(/,
  "expected the rendered definition sections to derive from the alphabetized group list",
);

assert.match(
  definitionsSource,
  /\{SORTED_DEFINITION_GROUPS\.map\(\(group\) => \(/,
  "expected the category buttons to use the alphabetized group list too",
);

assert.doesNotMatch(
  definitionsSource,
  /Search metrics or jump to a category so this page works like a reference, not a long flat glossary\./,
  "expected the Definitions hero helper subtitle to be removed",
);

console.log("definitions-screen-order.test.cjs passed");
