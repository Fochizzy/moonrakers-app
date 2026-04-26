const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(projectRoot, ...parts), "utf8");
}

const headToHeadSource = read("components", "charts", "HeadToHeadChart.tsx");
assert.match(
  headToHeadSource,
  /styles\.leaderBadge/,
  "expected HeadToHeadChart to restore the leader badge readout"
);
assert.match(
  headToHeadSource,
  /<Text style=\{styles\.verdict\}>\{summary\.verdict\}<\/Text>/,
  "expected HeadToHeadChart to restore the verdict footer copy"
);

const relationshipSource = read("components", "charts", "RelationshipGraph.tsx");
assert.match(
  relationshipSource,
  /<Text style=\{styles\.readoutTitle\}>Readout<\/Text>/,
  "expected RelationshipGraph to restore the readout heading"
);
assert.match(
  relationshipSource,
  /<Text style=\{styles\.focusTitle\}>Top Connections<\/Text>/,
  "expected RelationshipGraph to restore the Top Connections focus card"
);

const rivalrySource = read("components", "charts", "RivalryGraph.tsx");
assert.match(
  rivalrySource,
  /SectionHeader title="Player A" sub="Focus player"/,
  "expected RivalryGraph to restore the Player A selector heading"
);
assert.match(
  rivalrySource,
  /SectionHeader title="Player B" sub="Head-to-head target"/,
  "expected RivalryGraph to restore the Player B selector heading"
);
assert.match(
  rivalrySource,
  /label:\s*"Verdict"/,
  "expected RivalryGraph to restore the Verdict metric card"
);
assert.match(
  rivalrySource,
  /styles\.insightCardCompact/,
  "expected RivalryGraph to restore the summary insight card"
);

console.log("chart-component-restore.test.cjs passed");
