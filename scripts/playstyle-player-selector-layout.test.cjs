const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const source = read(path.join("components", "stats", "PlaystyleSection.tsx"));

assert.match(
  source,
  /import SegmentedControl/,
  "expected PlaystyleSection to keep the shared segmented selector control",
);

assert.doesNotMatch(
  source,
  /import PlayerSearchPicker/,
  "expected PlaystyleSection to stop importing the nested player search picker",
);

assert.doesNotMatch(
  source,
  /const \[playerSearchQuery, setPlayerSearchQuery\] = useState\(""\);/,
  "expected PlaystyleSection to stop owning its own search query state",
);

assert.match(
  source,
  /<View style=\{styles\.selectorSection\}>[\s\S]*<SegmentedControl/s,
  "expected the playstyle selector section to keep the segmented quick-switch rows",
);

assert.match(
  source,
  /label:\s*player\.id === authProfileId\s*\?\s*"You"\s*:\s*player\.name/,
  "expected the playstyle player selector to show You instead of duplicating the signed-in player's name",
);

assert.doesNotMatch(
  source,
  /badge:\s*authProfileId && player\.id === authProfileId \?\s*"You"\s*:\s*null/,
  "expected the playstyle player selector to drop the separate You badge",
);

assert.doesNotMatch(
  source,
  /Personal and global reads on how base-turn decisions line up with wins,\s*prestige,\s*objectives,\s*and support\./,
  "expected the old playstyle subtitle copy to be removed",
);

assert.doesNotMatch(
  source,
  /<PlayerSearchPicker[\s\S]*placeholder="Search players"/s,
  "expected the playstyle search box to be removed in favor of the shared stats-page focus picker",
);

assert.doesNotMatch(
  source,
  /ChartUnderlineTabs/,
  "expected the old underline tab selector to be removed from PlaystyleSection",
);

console.log("playstyle-player-selector-layout.test.cjs passed");
