const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const routesSource = fs.readFileSync(
  path.join(projectRoot, "utils", "appRoutes.ts"),
  "utf8",
);
const homeSource = fs.readFileSync(
  path.join(projectRoot, "app", "index.tsx"),
  "utf8",
);
const compareSource = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "compare", "index.tsx"),
  "utf8",
);
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function patchedResolveFilename(
  request,
  parent,
  isMain,
  options
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

const {
  APP_ROUTES,
  buildChartsRoute,
  buildCompareRoute,
  buildHistoryRoute,
} = require("../utils/appRoutes.ts");

assert.match(
  routesSource,
  /export function buildCompareRoute\(/,
  "expected utils/appRoutes.ts to expose a shared compare route builder",
);

assert.match(
  routesSource,
  /export function buildChartsRoute\(/,
  "expected utils/appRoutes.ts to expose a shared charts route builder",
);

assert.match(
  routesSource,
  /export function buildHistoryRoute\(/,
  "expected utils/appRoutes.ts to expose a shared History route builder",
);

assert.deepEqual(
  buildCompareRoute({
    mode: "players",
    ids: ["  alpha  ", "", "beta", "   "],
  }),
  {
    pathname: APP_ROUTES.compare,
    params: {
      mode: "players",
      ids: "alpha,beta",
    },
  },
  "expected the compare route builder to trim ids and serialize them as a comma-separated params string",
);

assert.deepEqual(
  buildChartsRoute({
    playerId: "  player-1 ",
    compareId: " compare-7  ",
    ids: ["  alpha  ", "beta ", ""],
    setup: true,
  }),
  {
    pathname: APP_ROUTES.charts,
    params: {
      playerId: "player-1",
      compareId: "compare-7",
      ids: "alpha,beta",
      setup: "1",
    },
  },
  "expected the charts route builder to trim ids and serialize optional params for the setup route",
);

assert.deepEqual(
  buildHistoryRoute(),
  {
    pathname: APP_ROUTES.history,
    params: undefined,
  },
  "expected the history route builder to return the base History route for Task 1 shortcuts",
);

assert.doesNotMatch(
  homeSource,
  /<SectionCard[\s\S]*title="Quick Launch"/,
  "expected the Home game tab to stop rendering the Quick Launch section",
);

assert.doesNotMatch(
  homeSource,
  /eyebrow="Live Ranking"|title="ELO Leaders"|<CompactEloStrip/,
  "expected the Home game tab to stop rendering the Live Ranking ELO leaders block",
);

assert.doesNotMatch(
  homeSource,
  /title="Compare"[\s\S]*title="Charts"[\s\S]*title="Profiles"[\s\S]*title="History"/s,
  "expected the Home game tab to stop rendering the Quick Launch shortcut buttons",
);

assert.doesNotMatch(
  homeSource,
  /<SectionCard[\s\S]*title="Players"[\s\S]*title="Quick Launch">/s,
  "expected the Home game tab to stop placing a Quick Launch section after the Players block",
);

assert.doesNotMatch(
  homeSource,
  /quickLaunchGrid:\s*\{[\s\S]*flexDirection:\s*"row"[\s\S]*flexWrap:\s*"wrap"[\s\S]*\}/s,
  "expected the Home styles to remove the quickLaunchGrid helper",
);

assert.doesNotMatch(
  homeSource,
  /quickLaunchButton:\s*\{[\s\S]*flexBasis:\s*"48%"[\s\S]*flexGrow:\s*1[\s\S]*\}/s,
  "expected the Home styles to remove the quickLaunchButton helper",
);

assert.doesNotMatch(
  homeSource,
  /router\.push\(buildCompareRoute\(\)\)/,
  "expected the Home game tab to stop wiring the Compare quick-launch shortcut",
);

assert.doesNotMatch(
  homeSource,
  /router\.push\(buildChartsRoute\(\)\)/,
  "expected the Home game tab to stop wiring the Charts quick-launch shortcut",
);

assert.doesNotMatch(
  homeSource,
  /router\.push\(APP_ROUTES\.playerDirectory\)/,
  "expected the Home game tab to stop wiring the Profiles quick-launch shortcut",
);

assert.doesNotMatch(
  homeSource,
  /router\.push\(buildHistoryRoute\(\)\)/,
  "expected the Home game tab to stop wiring the History quick-launch shortcut",
);

assert.match(
  compareSource,
  /typeof params\.ids === "string"[\s\S]*params\.ids\.split\(","\)\.map\(\(value\) => value\.trim\(\)\)\.filter\(Boolean\)/s,
  "expected the compare screen to trim comma-split ids from string params before filtering",
);

assert.match(
  compareSource,
  /Array\.isArray\(params\.ids\)[\s\S]*params\.ids[\s\S]*flatMap\(\(value\) => value\.split\(","\)\.map\(\(part\) => part\.trim\(\)\)\)[\s\S]*filter\(Boolean\)/s,
  "expected the compare screen to trim comma-split ids from array params before filtering",
);

console.log("home-quick-launch.test.cjs passed");
