const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "components", "charts", "compare", "ConditionalComparisonCard.tsx"),
  "utf8"
);

assert.match(
  source,
  /function QuickSelectTab\(/,
  "expected the conditional compare card to define a shared quick select underline tab helper"
);

const quickSelectTabUses = (source.match(/<QuickSelectTab/g) || []).length;

assert.equal(
  quickSelectTabUses,
  2,
  `expected both anchor and partner quick select rows to render QuickSelectTab, found ${quickSelectTabUses}`
);

assert.match(
  source,
  /quickSelectTabLineActive:\s*\{/,
  "expected the conditional compare card to style an active underline for quick select tabs"
);

assert.doesNotMatch(
  source,
  /quickSelectCardActive:\s*\{/,
  "expected the old quick select active pill style to be removed"
);

console.log("conditional-quick-select-underline.test.cjs passed");
