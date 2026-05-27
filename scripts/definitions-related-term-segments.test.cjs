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

assert.match(
  definitionsSource,
  /<Text style=\{styles\.relatedTermsLabel\}>Related<\/Text>/,
  "expected the Definitions screen to shorten the related-term heading to a lighter Related label",
);

assert.match(
  definitionsSource,
  /sourceContextChip:\s*\{[\s\S]*\.\.\.buttonSystem\.rectBase,[\s\S]*borderRadius:\s*10,/s,
  "expected the source-context chip to use the same segmented box shape language",
);

assert.match(
  definitionsSource,
  /relatedTermsRail:\s*\{[\s\S]*borderRadius:\s*16,[\s\S]*borderWidth:\s*1,[\s\S]*padding:\s*8,/s,
  "expected the Definitions related-term buttons to sit inside a shared segmented rail",
);

assert.match(
  definitionsSource,
  /relatedTermChip:\s*\{[\s\S]*flexBasis:\s*"48%",[\s\S]*flexGrow:\s*1,[\s\S]*minWidth:\s*118,/s,
  "expected the Definitions related-term buttons to normalize their widths into a steadier two-column rhythm",
);

assert.match(
  definitionsSource,
  /relatedTermChipText:\s*\{[\s\S]*textAlign:\s*"center",/s,
  "expected the Definitions related-term labels to center inside the new segmented boxes",
);

assert.match(
  definitionsSource,
  /const isCurrentTerm = relatedItem\.key === targetMetric;/,
  "expected the Definitions screen to detect when a related term already matches the active glossary term",
);

assert.match(
  definitionsSource,
  /disabled=\{isCurrentTerm\}/,
  "expected the Definitions related-term segment to disable itself when it already represents the active term",
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

assert.match(
  previewSource,
  /<Text style=\{styles\.relatedLabel\}>Related<\/Text>/,
  "expected the preview modal to shorten the related-term heading to Related too",
);

assert.match(
  previewSource,
  /relatedRail:\s*\{[\s\S]*borderRadius:\s*16,[\s\S]*borderWidth:\s*1,[\s\S]*padding:\s*8,/s,
  "expected the preview related-term buttons to sit inside a shared segmented rail",
);

assert.match(
  previewSource,
  /relatedChip:\s*\{[\s\S]*flexBasis:\s*"48%",[\s\S]*flexGrow:\s*1,[\s\S]*minWidth:\s*118,/s,
  "expected the preview related-term buttons to normalize their widths into a steadier two-column rhythm",
);

assert.match(
  previewSource,
  /relatedChipText:\s*\{[\s\S]*textAlign:\s*"center",/s,
  "expected the preview related-term labels to center inside the new segmented boxes",
);

assert.match(
  previewSource,
  /const isCurrentTerm = relatedItem\.key === metric;/,
  "expected the preview modal to detect when a related term already matches the active glossary term",
);

assert.match(
  previewSource,
  /disabled=\{isCurrentTerm\}/,
  "expected the preview related-term segment to disable itself when it already represents the active term",
);

assert.doesNotMatch(
  previewSource,
  /relatedChip:\s*\{[\s\S]*borderRadius:\s*999,/s,
  "expected the preview related-term style to stop using a full capsule radius",
);

console.log("definitions-related-term-segments.test.cjs passed");
