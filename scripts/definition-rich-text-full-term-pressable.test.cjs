const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "components", "ui", "DefinitionRichText.tsx"),
  "utf8",
);

assert.match(
  source,
  /DefinitionTermText/,
  "expected DefinitionRichText to reuse the dedicated pressable glossary term component for full-term labels",
);

assert.match(
  source,
  /segments\.length === 1[\s\S]*segment\.type === "term"[\s\S]*<DefinitionTermText/s,
  "expected DefinitionRichText to render a single full glossary term through DefinitionTermText so it stays tappable inside larger pressable cards",
);

console.log("definition-rich-text-full-term-pressable.test.cjs passed");
