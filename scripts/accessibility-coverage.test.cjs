const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(projectRoot, ...parts), "utf8");
}

// The shared primitives cover most of the app's tappable surface, so labelling
// them is what keeps a screen reader usable. Each one must name itself rather
// than relying on whatever text happens to be nested inside.
const PRIMITIVES = [
  {
    file: ["components", "ui", "ActionButton.tsx"],
    patterns: [/accessibilityRole="button"/, /accessibilityLabel=\{accessibilityLabel \?\?/],
  },
  {
    file: ["components", "ui", "SegmentedControl.tsx"],
    patterns: [/accessibilityRole="tab"/, /accessibilityState=\{\{ selected \}\}/],
  },
  {
    file: ["components", "ui", "HubTileCard.tsx"],
    patterns: [/accessibilityRole="link"/, /accessibilityLabel=\{\[title, description, badge\]/],
  },
  {
    file: ["components", "ui", "DefinitionsJumpLink.tsx"],
    patterns: [/accessibilityRole="link"/, /accessibilityLabel=\{label\}/],
  },
  {
    file: ["components", "ui", "ScalePressable.tsx"],
    patterns: [/accessibilityLabel=\{accessibilityLabel\}/],
  },
  {
    file: ["components", "ui", "AnimatedCard.tsx"],
    patterns: [/accessibilityLabel=\{accessibilityLabel\}/],
  },
  {
    file: ["components", "game", "ScaleButton.tsx"],
    patterns: [/accessibilityLabel=\{accessibilityLabel\}/, /accessibilityRole=\{accessibilityRole\}/],
  },
];

for (const primitive of PRIMITIVES) {
  const source = read(...primitive.file);
  const label = primitive.file.join("/");

  for (const pattern of primitive.patterns) {
    assert.match(
      source,
      pattern,
      `expected ${label} to keep its accessibility wiring (${pattern})`,
    );
  }
}

// The in-game scoring controls are icon and glyph only: "+", "-", "Yes", "No".
// Without labels they read as unlabelled buttons, which is the whole turn.
const GAME_CONTROL_LABELS = [
  ["components/game/DirectPrestigeSection.tsx", "Increase direct prestige"],
  ["components/game/DirectPrestigeSection.tsx", "Decrease direct prestige"],
  ["components/game/ObjectivesSection.tsx", "Increase objectives for"],
  ["components/game/AssistSection.tsx", "Increase assist prestige from"],
  ["components/game/ActionsSection.tsx", "Finish game"],
  ["components/game/PreviousRoundsSection.tsx", "Undo last turn"],
];

for (const [relPath, expected] of GAME_CONTROL_LABELS) {
  const source = read(...relPath.split("/"));
  assert.ok(
    source.includes(expected),
    `expected ${relPath} to label its control ("${expected}")`,
  );
}

console.log("accessibility-coverage.test.cjs passed");
