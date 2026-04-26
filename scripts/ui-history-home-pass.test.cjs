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

  expectIncludes(historySource, "utilitiesDrawerOpen", "history utility drawer state");
  expectIncludes(historySource, "primaryFilterPill", "history primary pill styles");
  expectIncludes(historySource, "Sort By", "history sort heading");

  expectIncludes(indexSource, 'type Tab = "game" | "leaderboard" | "hubs";', "home tab type rename");
  expectIncludes(indexSource, '"Hubs"', "home hubs label");
  expectIncludes(indexSource, "homePrimaryPill", "home primary pill styles");

  expectIncludes(appRoutesSource, '["game", "leaderboard", "hubs"]', "home route helper hubs tab");
});

run("Players hub and shared shell expose the new resume and backdrop markers", () => {
  const playersSource = read("app/players.tsx");
  const shellSource = read("components/ui/PageShell.tsx");

  expectIncludes(playersSource, "Continue Where You Left Off", "players resume card title");
  expectIncludes(playersSource, "resumeRecommendation", "players resume recommendation data");
  expectIncludes(playersSource, "resumeActionCard", "players resume card styles");

  expectIncludes(shellSource, "shellBackdrop", "page shell backdrop");
  expectIncludes(shellSource, "shellTopGlow", "page shell top glow");
  expectIncludes(shellSource, "shellContentInset", "page shell content inset");
});
