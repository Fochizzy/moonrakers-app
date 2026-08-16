const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

const source = fs.readFileSync(
  path.join(projectRoot, "components", "charts", "ReplayChart.tsx"),
  "utf8",
);

// The caller derives this flag from the selected game's actual round data. The
// replay must use that evidence instead of labelling every legitimate zero line.

assert.match(
  source,
  /roundDetailUnavailable\?: boolean/,
  "expected the replay chart to receive an explicit missing-detail signal",
);

assert.match(
  source,
  /Imported game — no round-by-round prestige or assist detail\./,
  "expected the flat replay note to explain the imported-game limitation",
);

assert.match(
  source,
  /\{roundDetailUnavailable \? \(/,
  "expected the note to render only for games proven to lack round detail",
);

console.log("replay-imported-flatline-note.test.cjs passed");
