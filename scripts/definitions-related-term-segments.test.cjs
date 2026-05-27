const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const definitionsSource = read(path.join("app", "definitions.tsx"));
const previewSource = read(path.join("components", "ui", "DefinitionPreviewModal.tsx"));

for (const [label, source] of [
  ["definitions route", definitionsSource],
  ["definition preview", previewSource],
]) {
  assert.match(
    source,
    /buttonSystem/,
    `expected the ${label} related-term boxes to use the shared segmented button tokens`,
  );

  assert.match(
    source,
    /relatedTerm(?:Chip|Segment)|related(?:Chip|Segment)/,
    `expected the ${label} to keep a dedicated related-term surface style`,
  );
}

assert.match(
  definitionsSource,
  /relatedTermChip:\s*\{[\s\S]*\.\.\.buttonSystem\.rectBase,[\s\S]*minHeight:\s*38,[\s\S]*borderRadius:\s*10,/s,
  "expected the Definitions related-term pills to become unmistakably boxy segments using the shared rectangle token",
);

assert.doesNotMatch(
  definitionsSource,
  /relatedTermChip:\s*\{[\s\S]*borderRadius:\s*999,/s,
  "expected the Definitions related-term style to stop using a full capsule radius",
);

assert.match(
  previewSource,
  /relatedChip:\s*\{[\s\S]*\.\.\.buttonSystem\.rectBase,[\s\S]*minHeight:\s*38,[\s\S]*borderRadius:\s*10,/s,
  "expected the preview related-term pills to become unmistakably boxy segments using the shared rectangle token",
);

assert.doesNotMatch(
  previewSource,
  /relatedChip:\s*\{[\s\S]*borderRadius:\s*999,/s,
  "expected the preview related-term style to stop using a full capsule radius",
);

console.log("definitions-related-term-segments.test.cjs passed");
