const fs = require("fs");
const path = require("path");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function expectIncludes(source, pattern, label) {
  if (!source.includes(pattern)) {
    throw new Error(`Missing ${label}: ${pattern}`);
  }
}

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

run("Stats and profile screens expose the new hierarchy markers", () => {
  const statsSource = read("app/stats.tsx");
  const profileSource = read("app/player-profile/[playerId].tsx");

  expectIncludes(statsSource, "statsHeroHighlights", "stats hero highlight data");
  expectIncludes(statsSource, "primaryTabPill", "primary tab pill styles");
  expectIncludes(statsSource, "Mission Snapshot", "stats hero title");

  expectIncludes(profileSource, "stickyProfileTabShell", "sticky profile tab shell");
  expectIncludes(profileSource, "profileSummaryCards", "profile summary disclosure");
  expectIncludes(profileSource, "Context Matchup", "context-only filter heading");
});

run("Creation, definitions, setup, and analytics screens expose the new browse patterns", () => {
  const addPlayersSource = read("app/add-players.tsx");
  const definitionsSource = read("app/definitions.tsx");
  const setupSource = read("app/game-setup.tsx");
  const analyticsSource = read("app/analytics.tsx");

  expectIncludes(addPlayersSource, "creationStepList", "creation step list");
  expectIncludes(addPlayersSource, "previewHeroCard", "player preview hero");
  expectIncludes(addPlayersSource, "groupSelectionSummary", "group sticky summary");

  expectIncludes(definitionsSource, "DEFINITION_GROUPS", "definition groups");
  expectIncludes(definitionsSource, "activeCategory", "definition category state");
  expectIncludes(definitionsSource, "Search metrics or jump to a category", "definition helper copy");

  expectIncludes(setupSource, "First Captain", "first captain emphasis");
  expectIncludes(setupSource, "Set the first captain and lock the table order.", "setup subtitle copy");
  expectIncludes(setupSource, 'join("  /  ")', "setup launch separator cleanup");

  expectIncludes(analyticsSource, "ANALYTICS_CARD_TONES", "analytics tint map");
});
