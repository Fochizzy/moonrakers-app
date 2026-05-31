const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const statsSource = fs.readFileSync(
  path.join(projectRoot, "app", "stats.tsx"),
  "utf8",
);

const playstyleAnchor = statsSource.indexOf('title="Playstyle Spotlight"');
assert.notEqual(
  playstyleAnchor,
  -1,
  "expected to find the Playstyle Spotlight title in stats.tsx",
);

const playstyleSectionStart = statsSource.lastIndexOf("<AnalyticsStateSection", playstyleAnchor);
const playstyleSectionEnd = statsSource.indexOf("</AnalyticsStateSection>", playstyleAnchor);

assert.notEqual(
  playstyleSectionStart,
  -1,
  "expected the Playstyle Spotlight title to live inside an AnalyticsStateSection",
);

assert.notEqual(
  playstyleSectionEnd,
  -1,
  "expected the Playstyle Spotlight section to close its AnalyticsStateSection",
);

const playstyleSectionSource = statsSource.slice(
  playstyleSectionStart,
  playstyleSectionEnd + "</AnalyticsStateSection>".length,
);

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

assert.match(
  playstyleSectionSource,
  /styles\.playstyleSpotlightHeader/,
  "expected the Playstyle Spotlight hero card to render a dedicated header row",
);

assert.match(
  playstyleSectionSource,
  /styles\.playstyleSpotlightRankBadge/,
  "expected the Playstyle Spotlight hero card to show a ranked badge",
);

assert.match(
  playstyleSectionSource,
  /styles\.playstyleSpotlightMetricRow/,
  "expected the Playstyle Spotlight hero card to split the label and value into a stronger metric row",
);

assert.match(
  playstyleSectionSource,
  /styles\.playstyleSupportGrid/,
  "expected the Playstyle Spotlight section to group supporting highlights in a dedicated support grid",
);

assert.match(
  playstyleSectionSource,
  /styles\.playstyleSupportCard/,
  "expected the Playstyle Spotlight section to stop using generic signal cards for supporting highlights",
);

assert.doesNotMatch(
  playstyleSectionSource,
  /styles\.signalCard/,
  "expected the Playstyle Spotlight section to retire the generic signal card styling for highlight formatting",
);

console.log("playstyle-spotlight-layout.test.cjs passed");
