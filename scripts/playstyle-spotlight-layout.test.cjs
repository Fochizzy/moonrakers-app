const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const statsSource = fs.readFileSync(
  path.join(projectRoot, "app", "stats.tsx"),
  "utf8",
);

const playstyleSectionMatch = statsSource.match(
  /title="Playstyle Spotlight"[\s\S]*?helpMetric="playstyle"/,
);

assert.ok(
  playstyleSectionMatch,
  "expected to find the Playstyle Spotlight section in stats.tsx",
);

const playstyleSectionSource = playstyleSectionMatch[0];

assert.doesNotMatch(
  playstyleSectionSource,
  /DefinitionsJumpLink[\s\S]*metric="playstyle"|DefinitionsJumpLink[\s\S]*category="efficiency"/,
  "expected the Playstyle Spotlight header to drop the extra Playstyle and Efficiency definition tags",
);

assert.doesNotMatch(
  playstyleSectionSource,
  /sectionActions/,
  "expected the Playstyle Spotlight section to stop building the right-side sectionActions stack",
);

console.log("playstyle-spotlight-layout.test.cjs passed");
