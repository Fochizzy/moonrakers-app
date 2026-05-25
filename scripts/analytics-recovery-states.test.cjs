const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const helperPath = path.join(projectRoot, "utils", "analyticsRecoveryState.ts");
const analyticsPath = path.join(projectRoot, "app", "analytics.tsx");
const statsPath = path.join(projectRoot, "app", "stats.tsx");

const helperSource = fs.existsSync(helperPath)
  ? fs.readFileSync(helperPath, "utf8")
  : "";
const analyticsSource = fs.readFileSync(analyticsPath, "utf8");
const statsSource = fs.readFileSync(statsPath, "utf8");

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

assert.match(
  helperSource,
  /export type AnalyticsRecoveryKind = "none" \| "no-players" \| "no-games" \| "player-empty"/,
  "expected a shared analytics recovery-state kind union",
);

assert.match(
  helperSource,
  /export function resolveAnalyticsRecoveryState\(/,
  "expected a shared analytics recovery-state resolver",
);

const { resolveAnalyticsRecoveryState } = require("../utils/analyticsRecoveryState.ts");

assert.deepEqual(
  resolveAnalyticsRecoveryState({
    loading: true,
    error: null,
    playersCount: 0,
    gamesCount: 0,
  }),
  { kind: "none" },
  "expected loading states to stay diagnostic instead of showing setup CTAs",
);

assert.deepEqual(
  resolveAnalyticsRecoveryState({
    loading: false,
    error: "Failed to load analytics.",
    playersCount: 0,
    gamesCount: 0,
  }),
  { kind: "none" },
  "expected error states to stay diagnostic instead of showing setup CTAs",
);

assert.deepEqual(
  resolveAnalyticsRecoveryState({
    loading: false,
    error: null,
    playersCount: 0,
    gamesCount: 7,
  }),
  { kind: "no-players" },
  "expected no-players when the account has no usable players",
);

assert.deepEqual(
  resolveAnalyticsRecoveryState({
    loading: false,
    error: null,
    playersCount: 3,
    gamesCount: 0,
  }),
  { kind: "no-games" },
  "expected no-games when players exist but there is no tracked mission history",
);

assert.deepEqual(
  resolveAnalyticsRecoveryState({
    loading: false,
    error: null,
    playersCount: 3,
    gamesCount: 5,
    playerOptionsCount: 3,
    hasLeagueData: true,
    selectedPlayerHasDetail: false,
  }),
  { kind: "player-empty" },
  "expected player-empty when league data exists but the selected player has no detail payload",
);

assert.deepEqual(
  resolveAnalyticsRecoveryState({
    loading: false,
    error: null,
    playersCount: 3,
    gamesCount: 5,
    playerOptionsCount: 3,
    hasLeagueData: true,
    selectedPlayerHasDetail: true,
  }),
  { kind: "none" },
  "expected none once player detail exists for the selected player",
);

assert.match(
  analyticsSource,
  /AnalyticsRecoveryCard/,
  "expected the analytics hub to render the shared AnalyticsRecoveryCard",
);

assert.match(
  analyticsSource,
  /Open roster[\s\S]*Profiles/s,
  "expected the analytics hub recovery actions to cover the no-players state",
);

assert.match(
  analyticsSource,
  /Open roster[\s\S]*APP_ROUTES\.roster/s,
  "expected the analytics hub no-players primary action to open the roster route",
);

assert.match(
  analyticsSource,
  /Profiles[\s\S]*APP_ROUTES\.playerDirectory/s,
  "expected the analytics hub no-players secondary action to open the player directory route",
);

assert.match(
  analyticsSource,
  /Start tracked game[\s\S]*Import backup/s,
  "expected the analytics hub recovery actions to cover the no-games state",
);

assert.match(
  analyticsSource,
  /Start tracked game[\s\S]*buildHomeRoute\("game"\)/s,
  "expected the analytics hub no-games primary action to use the shared game home route",
);

assert.match(
  analyticsSource,
  /Import backup[\s\S]*buildHistoryRoute\(\{\s*intent:\s*"import"\s*\}\)/s,
  "expected the analytics hub no-games secondary action to use the History import route",
);

assert.match(
  statsSource,
  /Start tracked game[\s\S]*buildHomeRoute\("game"\)/s,
  "expected the stats shared no-games primary action to use the shared game home route",
);

assert.match(
  statsSource,
  /Import backup[\s\S]*buildHistoryRoute\(\{\s*intent:\s*"import"\s*\}\)/s,
  "expected the stats shared no-games secondary action to use the History import route",
);

assert.match(
  statsSource,
  /Choose another player/,
  "expected the stats route to render a narrower player-empty recovery action",
);

assert.match(
  statsSource,
  /Open charts/,
  "expected the stats route to offer Open charts for player-specific empty states",
);

assert.match(
  statsSource,
  /Open charts[\s\S]*buildChartsRoute\(\)/s,
  "expected the stats player-empty secondary action to use the shared charts route builder",
);

assert.match(
  statsSource,
  /function renderPlaystyleTab\(\)[\s\S]*overviewRecoveryState\.kind === "no-players" \|\| overviewRecoveryState\.kind === "no-games"[\s\S]*renderSharedRecoveryCard\(overviewRecoveryState\.kind\)/s,
  "expected the playstyle tab to reuse the shared no-players and no-games recovery handling",
);

assert.match(
  statsSource,
  /function renderCorrelationsTab\(\)[\s\S]*overviewRecoveryState\.kind === "no-players" \|\| overviewRecoveryState\.kind === "no-games"[\s\S]*renderSharedRecoveryCard\(overviewRecoveryState\.kind\)/s,
  "expected the correlations tab to reuse the shared no-players and no-games recovery handling",
);

assert.match(
  statsSource,
  /function renderGamesTab\(\)[\s\S]*overviewRecoveryState\.kind === "no-players" \|\| overviewRecoveryState\.kind === "no-games"[\s\S]*renderSharedRecoveryCard\(overviewRecoveryState\.kind\)/s,
  "expected the games tab to reuse the shared no-players and no-games recovery handling",
);

console.log("analytics-recovery-states.test.cjs passed");
