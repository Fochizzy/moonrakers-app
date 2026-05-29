const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const homeSource = read(path.join("app", "index.tsx"));
const rosterSource = read(path.join("app", "add-players.tsx"));
const previewUtilSource = read(path.join("utils", "playerSelectionPreview.ts"));

assert.match(
  previewUtilSource,
  /export function buildPlayerSelectionPreview/,
  "expected utils/playerSelectionPreview.ts to export the shared preview helper",
);

assert.match(
  homeSource,
  /buildPlayerSelectionPreview\(filteredPlayers,\s*\{[\s\S]*priorityPlayerIds:\s*\[signedInPlayerId,\s*\.\.\.selectedIds\][\s\S]*maxVisible:\s*6[\s\S]*\}\)/,
  "expected app/index.tsx to collapse the Command picker to the signed-in player plus five more by default",
);

assert.match(
  homeSource,
  /showAllPlayers \? "Show Less" : "Show All"/,
  "expected app/index.tsx to render a Show All toggle for the collapsed Command picker",
);

assert.match(
  rosterSource,
  /buildPlayerSelectionPreview\(sortedPlayers,\s*\{[\s\S]*priorityPlayerIds:\s*\[signedInUserId,\s*\.\.\.selectedGroupPlayerIds\][\s\S]*maxVisible:\s*6[\s\S]*\}\)/,
  "expected app/add-players.tsx to collapse the saved-group picker to the signed-in player plus five more by default",
);

assert.match(
  rosterSource,
  /showAllGroupPlayers \? "Show Less" : "Show All"/,
  "expected app/add-players.tsx to render a Show All toggle for the collapsed saved-group picker",
);

console.log("player-selection-preview-toggle.test.cjs passed");
