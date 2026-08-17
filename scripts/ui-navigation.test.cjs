const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
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

let failures = 0;

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

run("UI refresh introduces canonical route helpers", () => {
  const appRoutesPath = path.join(projectRoot, "utils", "appRoutes.ts");

  assert.ok(
    fs.existsSync(appRoutesPath),
    "Expected utils/appRoutes.ts to exist for canonical route wiring"
  );

  const {
    APP_ROUTES,
    buildHomeRoute,
    buildPlayerProfileRoute,
  } = require("../utils/appRoutes.ts");

  assert.equal(APP_ROUTES.compare, "/charts/compare");
  assert.equal(APP_ROUTES.analytics, "/analytics");
  assert.equal(APP_ROUTES.roster, "/add-players");
  assert.equal(APP_ROUTES.playerDirectory, "/player-profile");

  assert.deepEqual(buildHomeRoute("leaderboard"), {
    pathname: "/",
    params: { initialTab: "leaderboard" },
  });

  assert.deepEqual(buildPlayerProfileRoute("player-7"), {
    pathname: "/player-profile/[playerId]",
    params: { playerId: "player-7" },
  });
});

run("Analytics and players hubs expose the consolidated navigation model", () => {
  const appHubsPath = path.join(projectRoot, "utils", "appHubs.ts");

  assert.ok(
    fs.existsSync(appHubsPath),
    "Expected utils/appHubs.ts to exist for shared hub metadata"
  );

  const { APP_ROUTES } = require("../utils/appRoutes.ts");
  const {
    getAnalyticsHubCards,
    getBridgeDestinations,
    getPlayersHubCards,
  } = require("../utils/appHubs.ts");

  const analyticsCards = getAnalyticsHubCards();
  assert.deepEqual(
    analyticsCards.map((card) => card.route),
    [
      APP_ROUTES.compare,
      APP_ROUTES.charts,
      APP_ROUTES.stats,
      APP_ROUTES.elo,
      APP_ROUTES.insights,
    ]
  );
  assert.ok(
    analyticsCards.every((card) => card.title && card.description),
    "Expected analytics cards to provide both title and description"
  );
  assert.deepEqual(
    analyticsCards.map((card) => card.iconKey),
    ["compare", "charts", "statistics", "elo", "ships"]
  );

  const playersHubCards = getPlayersHubCards();
  assert.deepEqual(
    playersHubCards.map((card) => card.route),
    [
      APP_ROUTES.roster,
      APP_ROUTES.playerDirectory,
      APP_ROUTES.playerCards,
    ]
  );

  const bridgeCards = getBridgeDestinations();
  assert.deepEqual(
    bridgeCards.map((card) => card.key),
    ["history", "analytics", "players", "definitions", "profile-management"]
  );
  assert.deepEqual(
    bridgeCards.map((card) => card.iconKey),
    ["miss", "shield", "orangePerson", "thruster", "moneyHub"]
  );
  assert.equal(
    bridgeCards.find((card) => card.key === "players")?.title,
    "Profile"
  );
  assert.equal(
    bridgeCards.find((card) => card.key === "analytics")?.route,
    APP_ROUTES.analytics
  );
  assert.equal(
    bridgeCards.find((card) => card.key === "profile-management")?.fullWidth,
    true,
    "Expected Manage Users/Groups to use the final full-width row"
  );
});

if (failures > 0) {
  process.exitCode = 1;
}
