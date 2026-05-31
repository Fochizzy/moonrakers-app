const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(projectRoot, "app", "stats.tsx"), "utf8");

assert.match(
  source,
  /<AnalyticsControlRail[\s\S]*\/>[\s\S]*<SectionCard[\s\S]*title="Focus Player"[\s\S]*<PlayerSearchPicker/s,
  "expected the stats screen to render a shared Focus Player card directly under the tab rail",
);

assert.match(
  source,
  /player\.label[\s\S]*player\.displayName[\s\S]*player\.playerName[\s\S]*player\.id/s,
  "expected the shared stats-player filter to match label, display name, player name, and id",
);

assert.match(
  source,
  /const handleSharedPlayerSelect = \(playerId: string\) => \{[\s\S]*setSelectedPlayerId\(playerId\);[\s\S]*setPlayerSearchQuery\(""\);[\s\S]*\}/,
  "expected stats.tsx to clear the shared player search after a selection",
);

assert.doesNotMatch(
  source,
  /<SectionCard title="Player Directory">/,
  "expected the Players tab to stop rendering the old nested Player Directory search card",
);

assert.match(
  source,
  /<PlaystyleSection[\s\S]*selectedPlayerId=\{selectedPlayerId\}[\s\S]*onSelectPlayer=\{setSelectedPlayerId\}/s,
  "expected PlaystyleSection to stay synced to the shared selected player state",
);

console.log("stats-shared-focus-player-layout.test.cjs passed");
