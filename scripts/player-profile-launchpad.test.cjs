const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "player-profile", "[playerId].tsx"),
  "utf8",
);
const routesSource = fs.readFileSync(
  path.join(projectRoot, "utils", "appRoutes.ts"),
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

const { APP_ROUTES, buildChartsRoute, buildCompareRoute } = require("../utils/appRoutes.ts");

assert.match(
  routesSource,
  /export function buildCompareRoute\(/,
  "expected utils/appRoutes.ts to expose the shared compare route builder used by the player-profile launchpad",
);

assert.match(
  routesSource,
  /export function buildChartsRoute\(/,
  "expected utils/appRoutes.ts to expose the shared charts route builder used by the player-profile launchpad",
);

assert.deepEqual(
  buildCompareRoute({
    mode: "players",
    ids: ["  player-7  ", ""],
  }),
  {
    pathname: APP_ROUTES.compare,
    params: {
      mode: "players",
      ids: "player-7",
    },
  },
  "expected the compare route builder to keep the focused player id and trim empty values",
);

assert.deepEqual(
  buildChartsRoute({
    playerId: "  player-7  ",
    setup: true,
  }),
  {
    pathname: APP_ROUTES.charts,
    params: {
      playerId: "player-7",
      setup: "1",
    },
  },
  "expected the charts route builder to carry the focused player into chart setup",
);

assert.match(
  source,
  /Quick Actions/,
  "expected the player-profile route to render a Quick Actions block",
);

assert.match(
  source,
  /Compare with\.\.\./,
  "expected the player-profile launchpad to expose Compare with...",
);

assert.match(
  source,
  /Open charts/,
  "expected the player-profile launchpad to expose Open charts",
);

assert.match(
  source,
  /Recent games/,
  "expected the player-profile launchpad to expose Recent games",
);

assert.doesNotMatch(
  source,
  /Jump into the next player workflow/,
  "expected the Quick Actions header to drop the old helper subtitle",
);

for (const snippet of [
  /Lock .* and pick the rival on the compare screen\./,
  /Carry this player into chart setup and choose the view there\./,
  /Jump straight to the existing history section lower on this profile\./,
]) {
  assert.doesNotMatch(
    source,
    snippet,
    "expected the player-profile quick action cards to drop the old descriptive helper copy",
  );
}

assert.match(
  source,
  /router\.push\(buildCompareRoute\(\{\s*mode:\s*"players",\s*ids:\s*\[String\(resolvedPlayerId\)\]/s,
  "expected Compare with... to push the shared compare route with the current player locked as the focused id",
);

assert.match(
  source,
  /router\.push\(buildChartsRoute\(\{\s*playerId:\s*String\(resolvedPlayerId\),\s*setup:\s*true,\s*\}\)\)/s,
  "expected Open charts to push the shared charts route with the current player in setup mode",
);

assert.match(
  source,
  /scrollViewRef\.current\?\.scrollTo\(\{/,
  "expected Recent games to jump by calling scrollViewRef.current?.scrollTo(...)",
);

assert.match(
  source,
  /const scrollViewRef = React\.useRef<ScrollView \| null>\(null\);/,
  "expected the player-profile screen to keep a ScrollView ref for launchpad scrolling",
);

assert.match(
  source,
  /const \[recentGamesAnchorY,\s*setRecentGamesAnchorY\] = useState\(0\);/,
  "expected the player-profile screen to keep a recent-games anchor y position",
);

assert.match(
  source,
  /const \[stickyShellHeight,\s*setStickyShellHeight\] = useState\(0\);/,
  "expected the player-profile screen to track sticky header height for the Recent games jump",
);

assert.match(
  source,
  /const handleProfileTabShellLayout = \(event: LayoutChangeEvent\) => \{[\s\S]*setStickyShellHeight\(height\);[\s\S]*setStickyShellAnchorY\(y\);[\s\S]*\};/,
  "expected the sticky profile tab shell layout handler to capture both the rendered height and sticky anchor position",
);

assert.match(
  source,
  /<ProfileTabRailShell[\s\S]*onLayout=\{handleProfileTabShellLayout\}/s,
  "expected the extracted sticky profile tab shell to report its layout through the shared handler",
);

assert.match(
  source,
  /onLayout=\{\(event\) => setRecentGamesAnchorY\(event\.nativeEvent\.layout\.y\)\}/,
  "expected the Recent Games section to capture its on-screen anchor position",
);

assert.match(
  source,
  /y:\s*Math\.max\(recentGamesAnchorY\s*-\s*stickyShellHeight\s*-\s*\d+,\s*0\)/,
  "expected the Recent games jump to subtract the sticky header height plus a padding offset",
);

assert.match(
  source,
  /stickyProfileTabShell[\s\S]*Recent Games[\s\S]*Quick Actions[\s\S]*bottomSpacer/s,
  "expected Quick Actions to render near the bottom of the page after the main profile content and recent games",
);

assert.match(
  source,
  /quickActionsGrid:\s*\{[\s\S]*flexDirection:\s*"row"[\s\S]*flexWrap:\s*"wrap"[\s\S]*\}/s,
  "expected the player-profile styles to define a quickActionsGrid layout",
);

assert.match(
  source,
  /quickActionCard:\s*\{[\s\S]*minWidth:\s*"31%"/s,
  "expected the player-profile styles to define compact quick action cards",
);

console.log("player-profile-launchpad.test.cjs passed");
