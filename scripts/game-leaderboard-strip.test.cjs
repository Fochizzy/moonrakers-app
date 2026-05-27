const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(mod, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const { outputText } = ts.transpileModule(source, {
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

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const { getLeaderboard } = require(path.join(projectRoot, "engine", "gameEngine.ts"));
const {
  PLAYER_STRIP_CARD_WIDTH,
  PLAYER_STRIP_GAP,
  PLAYER_STRIP_SIDE_INSET,
  getCenteredLeaderboardOffset,
} = require(path.join(projectRoot, "lib", "game-screen", "leaderboardStrip.ts"));

const ranked = getLeaderboard(
  {
    alpha: {
      totalPrestige: 6,
      directPrestige: 6,
      objectiveCount: 0,
      objectivePrestige: 0,
      assistPrestigeReceived: 0,
      assistPrestigeSent: 0,
      assistPrestigeBySource: {},
      assistCountBySource: {},
      score: 99,
      assists: 0,
      failures: 0,
      contracts: 0,
      allContractsEfficiency: 0,
      assistEfficiency: 0,
      directEfficiency: 0,
    },
    beta: {
      totalPrestige: 7,
      directPrestige: 7,
      objectiveCount: 0,
      objectivePrestige: 0,
      assistPrestigeReceived: 0,
      assistPrestigeSent: 0,
      assistPrestigeBySource: {},
      assistCountBySource: {},
      score: 1,
      assists: 0,
      failures: 0,
      contracts: 0,
      allContractsEfficiency: 0,
      assistEfficiency: 0,
      directEfficiency: 0,
    },
    gamma: {
      totalPrestige: 7,
      directPrestige: 7,
      objectiveCount: 0,
      objectivePrestige: 0,
      assistPrestigeReceived: 0,
      assistPrestigeSent: 0,
      assistPrestigeBySource: {},
      assistCountBySource: {},
      score: 5,
      assists: 0,
      failures: 0,
      contracts: 0,
      allContractsEfficiency: 0,
      assistEfficiency: 0,
      directEfficiency: 0,
    },
  },
  [
    { id: "alpha", name: "Alpha" },
    { id: "beta", name: "Beta" },
    { id: "gamma", name: "Gamma" },
  ],
);

assert.deepEqual(
  ranked.map((entry) => entry.id),
  ["gamma", "beta", "alpha"],
  "expected the in-game leaderboard to rank players by Points first, then Score on ties",
);

assert.equal(
  getCenteredLeaderboardOffset({
    activeIndex: 0,
    entryCount: 4,
    viewportWidth: 320,
    cardWidth: PLAYER_STRIP_CARD_WIDTH,
    gap: PLAYER_STRIP_GAP,
    sideInset: PLAYER_STRIP_SIDE_INSET,
  }),
  0,
  "expected the centered leaderboard offset to clamp the first card to the left edge",
);

const centeredMiddleOffset = getCenteredLeaderboardOffset({
  activeIndex: 1,
  entryCount: 4,
  viewportWidth: 320,
  cardWidth: PLAYER_STRIP_CARD_WIDTH,
  gap: PLAYER_STRIP_GAP,
  sideInset: PLAYER_STRIP_SIDE_INSET,
});

assert.equal(
  centeredMiddleOffset,
  38,
  "expected the centered leaderboard offset to center a middle active card when space allows",
);

assert.equal(
  getCenteredLeaderboardOffset({
    activeIndex: 3,
    entryCount: 4,
    viewportWidth: 320,
    cardWidth: PLAYER_STRIP_CARD_WIDTH,
    gap: PLAYER_STRIP_GAP,
    sideInset: PLAYER_STRIP_SIDE_INSET,
  }),
  202,
  "expected the centered leaderboard offset to clamp the last card to the right edge",
);

const gameSource = read(path.join("app", "game.tsx"));

assert.match(
  gameSource,
  /const leaderboardEntries = useMemo\(/,
  "expected the game screen to render the strip from ranked leaderboard entries",
);

assert.match(
  gameSource,
  /const activeIndex = entries\.findIndex\(\(entry\) => entry\.id === activePlayerId\);/,
  "expected the compact leaderboard strip to track the active card index for centering",
);

assert.match(
  gameSource,
  /scrollTo\(\{\s*x: centeredOffset,\s*animated: hasCenteredStripRef\.current,\s*\}\)/,
  "expected the compact leaderboard strip to scroll the active player card into the centered position",
);

assert.match(
  gameSource,
  /paddingHorizontal:\s*PLAYER_STRIP_SIDE_INSET,/,
  "expected the leaderboard strip to use symmetric side padding instead of only trailing padding",
);

assert.match(
  gameSource,
  /<View style=\{styles\.playerPillBody\}>[\s\S]*?<Text style=\{styles\.playerPillName\}[\s\S]*?<View style=\{styles\.playerPillMetrics\}>/m,
  "expected the compact leaderboard pill to place abbreviated point and score metrics on a second row under the player name",
);

assert.match(
  gameSource,
  /P:\s*\{entry\.totalPrestige\}/,
  "expected the compact leaderboard pill to show P: in the metrics row",
);

assert.match(
  gameSource,
  /S:\s*\{entry\.score\}/,
  "expected the compact leaderboard pill to show S: in the metrics row",
);

assert.doesNotMatch(
  gameSource,
  /Points \{entry\.totalPrestige\}/,
  "expected the compact leaderboard pill to stop rendering the full Points label",
);

assert.doesNotMatch(
  gameSource,
  /Score \{entry\.score\}/,
  "expected the compact leaderboard pill to stop rendering the full Score label",
);

assert.doesNotMatch(
  gameSource,
  /Src \{/,
  "expected the compact leaderboard pill to stop rendering Src in place of Score",
);

assert.match(
  gameSource,
  /playerPill:\s*\{[\s\S]*width:\s*PLAYER_STRIP_CARD_WIDTH,[\s\S]*minHeight:\s*44,/,
  "expected the compact leaderboard pill to use a slightly smaller fixed card width so the strip can center active players cleanly",
);

console.log("game-leaderboard-strip.test.cjs passed");
