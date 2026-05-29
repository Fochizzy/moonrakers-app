const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const compareInsightSource = read(
  path.join("components", "charts", "compare", "CompareInsightBar.tsx"),
);
const compareIndexSource = read(path.join("app", "charts", "compare", "index.tsx"));
const compareSelectionSource = read(
  path.join("components", "charts", "compare", "CompareSelectionCard.tsx"),
);
const compareHelpersSource = read(path.join("utils", "compareHelpers.ts"));

assert.doesNotMatch(
  compareInsightSource,
  /const TRAIT_DEFINITIONS = \[/,
  "expected compare insights to remove the dedicated trait definition list from the compare read",
);

assert.doesNotMatch(
  compareInsightSource,
  /Trait definitions/,
  "expected the compare insight card to stop rendering a Trait definitions section below the chart read",
);

assert.match(
  compareInsightSource,
  /function buildPlayerVsFieldAggregateRead\(rows: CompareRow\[\]\): string\[\]/,
  "expected a dedicated long-form player-vs-field aggregate narrative builder",
);

assert.match(
  compareInsightSource,
  /const isPlayerVsFieldAggregate = rows\.some\(\(row\) => row\.id === PLAYER_FIELD_SELF_ROW_ID\) && rows\.some\(\(row\) => row\.id === PLAYER_FIELD_OPPONENTS_ROW_ID\);/,
  "expected compare insights to detect the special self-versus-field aggregate rows",
);

assert.match(
  compareInsightSource,
  /const bottomLines = isPlayerVsFieldAggregate && fieldAggregateRead\.length >= 5[\s\S]*modeLabel === 'players' && rows\.length === 2 && playstyleRead\.length >= 3[\s\S]*readLines;/,
  "expected the field aggregate mode to swap in the longer 5-6 sentence narrative before the normal two-player read",
);

assert.match(
  compareIndexSource,
  /const \[cohesionSelectionMode, setCohesionSelectionMode\] = useState<"manual" \| "player_field_aggregate">\("manual"\);/,
  "expected the compare screen to track a dedicated player-field aggregate selection mode",
);

assert.match(
  compareIndexSource,
  /buildPlayerVsOpponentAggregateRows\(\{[\s\S]*playerId: compareAuthPlayerId,[\s\S]*playerMap,[\s\S]*games,[\s\S]*\}\)/,
  "expected the compare screen to build self-versus-field rows from shared-game history",
);

assert.match(
  compareIndexSource,
  /specialSelection=\{\s*mode === "players" \? playerFieldAggregateOption : null\s*\}/,
  "expected the cohesion selection card to receive the special field aggregate quick-pick",
);

assert.match(
  compareSelectionSource,
  /specialSelection\?: \{[\s\S]*title: string;[\s\S]*subtitle: string;[\s\S]*active: boolean;[\s\S]*onPress: \(\) => void;[\s\S]*\} \| null;/,
  "expected the selection card to accept a special aggregate selection option",
);

assert.match(
  compareSelectionSource,
  /You vs played field|Played field aggregate/,
  "expected the selection card UI to expose a visible played-field aggregate option",
);

assert.match(
  compareHelpersSource,
  /export const PLAYER_FIELD_SELF_ROW_ID = "__player_field_self__";/,
  "expected compare helpers to define a stable self-row id for the field aggregate mode",
);

assert.match(
  compareHelpersSource,
  /export const PLAYER_FIELD_OPPONENTS_ROW_ID = "__player_field_opponents__";/,
  "expected compare helpers to define a stable opponent aggregate row id",
);

assert.match(
  compareHelpersSource,
  /export function buildPlayerVsOpponentAggregateRows\(\{[\s\S]*playerId:[\s\S]*playerMap:[\s\S]*games:[\s\S]*\}\)/,
  "expected compare helpers to build a self-versus-opponents aggregate row set",
);

console.log("compare-aggregate-field-read.test.cjs passed");
