const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "player-profile", "[playerId].tsx"),
  "utf8",
);

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolveFilename(
  request,
  parent,
  isMain,
  options,
) {
  if (request.startsWith("@/")) {
    request = path.join(projectRoot, request.slice(2));
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(mod, filename) {
    const fileSource = fs.readFileSync(filename, "utf8");
    const { outputText } = ts.transpileModule(fileSource, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        allowJs: true,
      },
      fileName: filename,
    });

    mod._compile(outputText, filename);
  };
}

assert.match(
  source,
  /const profileStickyHeaderIndices = Platform\.OS === "android" \? undefined : \[3\];/,
  "expected the player profile screen to keep the profile tab rail at sticky index 3 while disabling the native sticky rail on Android",
);

assert.match(
  source,
  /stickyHeaderIndices=\{profileStickyHeaderIndices\}/,
  "expected only the profile tab rail shell to stay sticky through the shared sticky-header configuration",
);

assert.doesNotMatch(
  source,
  /stickyHeaderIndices=\{\[4\]\}/,
  "expected the player profile screen to stop pinning the metric card stack as the sticky header",
);

assert.match(
  source,
  /buildSectionCards/,
  "expected the player profile route to import the shared ELO section fallback builder",
);

assert.match(
  source,
  /const fallbackSection = useMemo\(/,
  "expected the player profile route to build a fallback metrics section when the server tab payload is empty",
);

assert.match(
  source,
  /const resolvedSectionCards = sectionCards\.length > 0 \? sectionCards : fallbackSection\.cards;/,
  "expected the player profile route to use fallback metric cards instead of showing an empty Leaderboard Metrics section",
);

const {
  buildContextRows,
  buildGameRowsByPlayer,
  buildSectionCards,
  buildSummary,
} = require("../utils/eloScreenAnalytics.ts");

const players = [
  { id: "fochizzy", name: "Fochizzy" },
  { id: "greg", name: "Greg" },
  { id: "izzy", name: "Izzy" },
];

const games = [
  {
    id: "g1",
    createdAt: 10,
    winnerId: "fochizzy",
    players,
  },
  {
    id: "g2",
    createdAt: 20,
    winnerId: "greg",
    players,
  },
  {
    id: "g3",
    createdAt: 30,
    winnerId: "fochizzy",
    players,
  },
];

const rowsByPlayer = buildGameRowsByPlayer(games, players);
const summary = {
  ...buildSummary("fochizzy", players, rowsByPlayer, { fochizzy: 906 }),
  peakElo: 1000,
};
const leaderboardSection = buildSectionCards(
  "Leaderboard",
  summary,
  rowsByPlayer.fochizzy,
  buildContextRows(rowsByPlayer.fochizzy, null),
  null,
);

assert.equal(
  leaderboardSection.title,
  "Leaderboard Metrics",
  "expected the fallback section helper to preserve the Leaderboard Metrics title",
);

assert.ok(
  leaderboardSection.cards.length >= 6,
  "expected the fallback section helper to provide leaderboard metric cards when server tab cards are missing",
);

console.log("player-profile-elo-metrics-regression.test.cjs passed");
