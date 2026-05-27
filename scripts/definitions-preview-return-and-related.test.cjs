const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const appRoutesSource = read(path.join("utils", "appRoutes.ts"));
const definitionsSource = read(path.join("app", "definitions.tsx"));
const termTextSource = read(path.join("components", "ui", "DefinitionTermText.tsx"));
const jumpLinkSource = read(path.join("components", "ui", "DefinitionsJumpLink.tsx"));
const previewSource = read(path.join("components", "ui", "DefinitionPreviewModal.tsx"));
const catalogSource = read(path.join("utils", "definitionCatalog.ts"));

assert.match(
  appRoutesSource,
  /sourceLabel\?: string \| null/,
  "expected Definitions route builder to support source labels for return context",
);

assert.match(
  appRoutesSource,
  /sourceLabel = String\(input\?\.sourceLabel \?\? ""\)\.trim\(\)/,
  "expected Definitions route builder to normalize source labels",
);

assert.match(
  appRoutesSource,
  /sourceLabel \? \{ sourceLabel \} : \{\}/,
  "expected Definitions route builder to include source labels in params when present",
);

assert.match(
  termTextSource,
  /onLongPress=\{\(\) => setPreviewOpen\(true\)\}/,
  "expected standalone definition terms to open a lightweight preview on long press",
);

assert.match(
  termTextSource,
  /sourceLabel:/,
  "expected standalone definition terms to pass source context into the Definitions route",
);

assert.match(
  jumpLinkSource,
  /sourceLabel:/,
  "expected shared Definitions jump links to preserve source context too",
);

assert.match(
  previewSource,
  /relatedTermKeys/,
  "expected the preview modal to show related glossary terms",
);

assert.match(
  previewSource,
  /buildDefinitionsRoute/,
  "expected preview related-term chips to route back through the shared Definitions route helper",
);

assert.match(
  definitionsSource,
  /sourceLabel\?: string;/,
  "expected Definitions screen to read source context from the route",
);

assert.match(
  definitionsSource,
  /router\.back\(\)/,
  "expected Definitions to offer a quick return action back to the originating screen",
);

assert.match(
  definitionsSource,
  /Opened from/,
  "expected Definitions to label where a deep-linked glossary visit came from",
);

assert.match(
  definitionsSource,
  /relatedTermKeys/,
  "expected Definitions cards to render related glossary terms",
);

assert.match(
  catalogSource,
  /export const RELATED_DEFINITION_KEYS/,
  "expected the shared glossary catalog to define explicit related-term mappings",
);

console.log("definitions-preview-return-and-related.test.cjs passed");
