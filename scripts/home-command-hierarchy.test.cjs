const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const screenSource = fs.readFileSync(
  path.join(projectRoot, "app", "index.tsx"),
  "utf8",
);

assert.match(
  screenSource,
  /<SectionCard[\s\S]*eyebrow="Mission Prep"[\s\S]*title=\{commandPrepTitle\}[\s\S]*title="Start Game"[\s\S]*subtitle=\{startGameSubtitle\}/s,
  "expected the Command tab to introduce a Mission Prep section that pairs the start CTA with the current crew summary",
);

assert.match(
  screenSource,
  /const\s+commandPrepTitle\s*=\s*canStart\s*\?\s*"Start with this crew"\s*:\s*"Choose your crew"/s,
  "expected the Command screen to use a simpler prep title that focuses on choosing or starting with the crew",
);

assert.match(
  screenSource,
  /const\s+activeSelectedGroup\s*=\s*useMemo\([\s\S]*const\s+selectedCrewLabel\s*=\s*selectedPlayers[\s\S]*join\(" • "\)[\s\S]*const\s+startGameSubtitle\s*=\s*activeSelectedGroup\?\.name\?\.trim\(\)\s*\|\|\s*selectedCrewLabel\s*\|\|\s*"Select 2 to 5 captains"/s,
  "expected the Start Game button subtitle to prefer a detected group name, then player names, then the empty selection instruction",
);

assert.doesNotMatch(
  screenSource,
  /homePrimaryPill|commandPrepHint|selectedCrewWrap|selectedCrewEmpty|Make the current crew and launch state obvious before diving into the full picker\./,
  "expected the Command prep section to remove the redundant pill row, standalone crew list, and long helper copy",
);

assert.doesNotMatch(
  screenSource,
  /eyebrow="Selected Crew"/,
  "expected the standalone Selected Crew card to be replaced by the tighter Mission Prep story",
);

assert.match(
  screenSource,
  /eyebrow="Mission Prep"[\s\S]*title="Players"/s,
  "expected Mission Prep to appear before the heavier Players picker block",
);

console.log("home-command-hierarchy.test.cjs passed");
