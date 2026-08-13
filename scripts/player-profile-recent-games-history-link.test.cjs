const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const recentGamesSource = fs.readFileSync(
  path.join(projectRoot, "components", "player-profile", "PlayerProfileRecentGames.tsx"),
  "utf8",
);
const historySource = fs.readFileSync(
  path.join(projectRoot, "app", "history.tsx"),
  "utf8",
);
const pageShellSource = fs.readFileSync(
  path.join(projectRoot, "components", "ui", "PageShell.tsx"),
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

const { APP_ROUTES, buildHistoryRoute } = require("../utils/appRoutes.ts");

assert.deepEqual(
  buildHistoryRoute({ gameId: "game-42" }),
  {
    pathname: APP_ROUTES.history,
    params: { gameId: "game-42" },
  },
  "expected the shared History route builder to accept a focused game id for deep-link snaps",
);

assert.match(
  recentGamesSource,
  /buildHistoryRoute/,
  "expected PlayerProfileRecentGames to import the shared History route builder for long-press deep links",
);

assert.match(
  recentGamesSource,
  /onLongPress=\{\(\) => \{\s*if \(gameId\) router\.push\(buildHistoryRoute\(\{\s*gameId\s*\}\) as any\);\s*\}\}/s,
  "expected a long press on a profile recent-game row to jump into History focused on that game",
);

assert.match(
  recentGamesSource,
  /const historyOrdinal = typeof game\.historyOrdinal === "number" && Number\.isFinite\(game\.historyOrdinal\)\s*\?\s*game\.historyOrdinal\s*:\s*recentGames\.length - index/,
  "expected profile recent-game labels to prefer the shared history ordinal and only fall back to local indexing when no history rank is available",
);

assert.match(
  historySource,
  /useLocalSearchParams<\{\s*gameId\?: string \| string\[\]\s*\}>/,
  "expected the History screen to read an optional focused game id from route params",
);

assert.match(
  pageShellSource,
  /scrollRef\?: React\.Ref<ScrollView>/,
  "expected PageShell to expose an optional ScrollView ref so routes like History can own deep-link snapping",
);

assert.match(
  historySource,
  /const scrollViewRef = React\.useRef<ScrollView \| null>\(null\);/,
  "expected the History screen to keep a ScrollView ref for focused-game snapping",
);

assert.match(
  historySource,
  /<PageShell[\s\S]*scrollRef=\{scrollViewRef\}/,
  "expected the History screen to pass its ScrollView ref into PageShell",
);

assert.match(
  historySource,
  /rowNode\.measureLayout\(\s*scrollNode,\s*\(_x,\s*y\)\s*=>\s*\{\s*scrollViewRef\.current\?\.scrollTo\(\{\s*y:\s*Math\.max\(\s*y\s*-\s*\d+,\s*0\s*\),\s*animated:\s*true,\s*\}\)/s,
  "expected the History screen to measure the focused row against the live ScrollView before scrolling the archive to it",
);

assert.match(
  historySource,
  /const focusedGame = useResolvedGame<StoredGame>\(focusedGameId\)\.game;/,
  "expected the History screen to resolve a focused game that the local store may not hold",
);

assert.match(
  historySource,
  /if \(\s*focusedGameId &&\s*focusedGame &&\s*!sorted\.some\(\(game\) => normalizeHistoryId\(game\?\.id\) === focusedGameId\)\s*\) \{\s*return \[focusedGame, \.\.\.sorted\];/s,
  "expected a deep-linked game to appear even when the active filter, search, or an unsynced store would hide it",
);

console.log("player-profile-recent-games-history-link.test.cjs passed");
