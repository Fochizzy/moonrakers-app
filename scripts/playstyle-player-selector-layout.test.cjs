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
  "expected PlaystyleSection to reuse the shared segmented selector control",
);

assert.match(
  source,
  /import PlayerSearchPicker/,
  "expected PlaystyleSection to reuse the shared player search picker",
);

assert.match(
  source,
  /<SegmentedControl[\s\S]*<PlayerSearchPicker/s,
  "expected the playstyle player tabs to render as segmented controls above the player search",
);

assert.match(
  source,
  /placeholder="Search players"/,
  "expected the playstyle player search to use the shared search input underneath the tabs",
);

assert.match(
  source,
  /showResultsOnlyWhenQuery/,
  "expected the playstyle player search to stay quiet until the user starts typing",
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
  /Quick tabs stay above\. Search here when you want a specific player\./,
  "expected the playstyle search helper copy to be removed",
);

assert.doesNotMatch(
  source,
  /ChartUnderlineTabs/,
  "expected the old underline tab selector to be removed from PlaystyleSection",
);

console.log("playstyle-player-selector-layout.test.cjs passed");
