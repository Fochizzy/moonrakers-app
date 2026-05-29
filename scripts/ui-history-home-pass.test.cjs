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

run("History and home surfaces expose the new control language", () => {
  const historySource = read("app/history.tsx");
  const indexSource = read("app/index.tsx");
  const appRoutesSource = read("utils/appRoutes.ts");

  expectIncludes(historySource, "Command", "history command escape hatch");
  expectIncludes(historySource, "router.push(APP_ROUTES.home)", "history command route wiring");
  expectIncludes(historySource, "Sort By", "history sort heading");
  expectIncludes(historySource, "function HistoryTab(", "history underline tab helper");

  const historyTabUses = (historySource.match(/<HistoryTab/g) || []).length;
  if (historyTabUses < 7) {
    throw new Error(
      `Expected history filter and sort rails to use underline HistoryTab controls, found ${historyTabUses} uses.`
    );
  }

  if (historySource.includes("primaryFilterPill")) {
    throw new Error("Expected history primary pill styles to be removed in favor of underline tabs.");
  }
  if (historySource.includes("utilitiesDrawerOpen")) {
    throw new Error("Expected history utility drawer state to be removed.");
  }
  if (historySource.includes("Utilities")) {
    throw new Error("Expected history Utilities button copy to be removed.");
  }
  if (historySource.includes("Backup + Sync")) {
    throw new Error("Expected history Backup + Sync surface to be removed.");
  }

  expectIncludes(indexSource, 'type Tab = "game" | "leaderboard" | "hubs";', "home tab type rename");
  expectIncludes(indexSource, '"Hubs"', "home hubs label");
  expectIncludes(indexSource, 'eyebrow="Mission Prep"', "home mission prep section");
  expectIncludes(indexSource, "selectedCrewLabel", "home start button crew summary");

  expectIncludes(appRoutesSource, '["game", "leaderboard", "hubs"]', "home route helper hubs tab");
});

run("Shared shell keeps its backdrop markers", () => {
  const shellSource = read("components/ui/PageShell.tsx");

  expectIncludes(shellSource, "shellBackdrop", "page shell backdrop");
  expectIncludes(shellSource, "shellTopGlow", "page shell top glow");
  expectIncludes(shellSource, "shellContentInset", "page shell content inset");
});
