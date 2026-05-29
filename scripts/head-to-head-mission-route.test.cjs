const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const routesSource = fs.readFileSync(
  path.join(projectRoot, "utils", "appRoutes.ts"),
  "utf8",
);
const gameSource = fs.readFileSync(
  path.join(projectRoot, "app", "game.tsx"),
  "utf8",
);
const missionScreenPath = path.join(projectRoot, "app", "head-to-head-mission.tsx");

assert.match(
  routesSource,
  /headToHeadMission:\s*"\/head-to-head-mission"/,
  "expected utils/appRoutes.ts to register a dedicated head-to-head mission route",
);

assert.match(
  gameSource,
  /Head to Head Mission/,
  "expected the game screen to render a Head to Head Mission button",
);

assert.doesNotMatch(
  gameSource,
  /Set 1st place and 2nd place mission bonuses/,
  "expected the inactive mission card to drop the old helper subtitle",
);

assert.match(
  gameSource,
  /router\.push\(APP_ROUTES\.headToHeadMission\)/,
  "expected the new mission button to navigate to the head-to-head mission screen",
);

assert.match(
  gameSource,
  /onClearHeadToHeadMission/,
  "expected the direct prestige section to accept a clear-mission action",
);

assert.match(
  gameSource,
  /updateCurrent\(\{\s*headToHeadFirstPlaceId:\s*null,\s*headToHeadSecondPlaceId:\s*null\s*\}\)/,
  "expected the game screen to clear both mission placements from the current turn state",
);

assert.match(
  gameSource,
  /headToHeadActiveClearButton/,
  "expected an active mission state inside the direct prestige card with its own clear control",
);

assert.match(
  gameSource,
  /withAlpha\(UI\.silver,/,
  "expected the active head-to-head mission state to use the silver mission treatment",
);

assert.match(
  gameSource,
  /headToHeadOrdinalSuffix/,
  "expected the active mission summary to define a dedicated superscript suffix style for 1st and 2nd",
);

assert.ok(
  fs.existsSync(missionScreenPath),
  "expected a dedicated app/head-to-head-mission.tsx route for placing first and second",
);

if (fs.existsSync(missionScreenPath)) {
  const missionSource = fs.readFileSync(missionScreenPath, "utf8");

  assert.match(missionSource, /Choose 1st Player/);
  assert.match(missionSource, /1 Direct Prestige/);
  assert.match(missionSource, /Choose 2nd Place/);
  assert.match(
    missionSource,
    /const selectionReady = hasHeadToHeadSelection\(\{[\s\S]*headToHeadFirstPlaceId:\s*firstPlaceId,[\s\S]*headToHeadSecondPlaceId:\s*secondPlaceId,[\s\S]*\}\);/s,
    "expected the mission screen to derive a ready-to-apply state from both chosen placements",
  );
  assert.match(
    missionSource,
    /<Pressable[\s\S]*disabled=\{!selectionReady\}[\s\S]*style=\{\[styles\.primaryAction,\s*!selectionReady && styles\.primaryActionDisabled\]\}[\s\S]*>\s*<Text style=\{styles\.primaryActionText\}>Apply Mission<\/Text>/s,
    "expected Apply Mission to be disabled until both placements are chosen",
  );

  assert.doesNotMatch(
    missionSource,
    /Pick the 1st-place and 2nd-place finishers for this mission result\./,
    "expected the mission hero card to drop the picker subtitle copy",
  );

  assert.doesNotMatch(
    missionSource,
    /SelectionCard|summaryRow|selectionCard/,
    "expected the mission screen to drop the top summary pills",
  );

  assert.doesNotMatch(
    missionSource,
    /If the active turn player wins this mission/i,
    "expected the first-place chooser to drop the long scoring explanation",
  );

  assert.doesNotMatch(
    missionSource,
    /Second place always gets 2 score/i,
    "expected the second-place chooser to drop the helper explanation",
  );

  assert.match(
    missionSource,
    /sectionTitle:\s*\{[\s\S]*fontSize:\s*16,/,
    "expected the chooser section titles to shrink a bit for a denser mission screen",
  );

  assert.match(
    missionSource,
    /playerOption:\s*\{[\s\S]*paddingVertical:\s*10,/,
    "expected the chooser pills to get shorter vertically",
  );

  assert.match(
    missionSource,
    /playerOptionText:\s*\{[\s\S]*fontSize:\s*15,/,
    "expected the chooser pill text to shrink slightly too",
  );
}

console.log("head-to-head-mission-route.test.cjs passed");
