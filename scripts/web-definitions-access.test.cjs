const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const analyticsSource = read(path.join("app", "analytics.tsx"));
const chartDetailSource = read(path.join("app", "charts", "[chartKey].tsx"));
const definitionsSource = read(path.join("app", "definitions.tsx"));

assert.match(
  definitionsSource,
  /title="Definitions"/,
  "expected the website to keep a dedicated Definitions page"
);

assert.match(
  analyticsSource,
  /DefinitionsJumpLink/,
  "expected the analytics website surface to provide a direct link into the Definitions page"
);

assert.match(
  chartDetailSource,
  /DefinitionRichText|DefinitionsJumpLink/,
  "expected chart detail pages on the website to expose glossary-aware copy or links"
);

console.log("web-definitions-access.test.cjs passed");
