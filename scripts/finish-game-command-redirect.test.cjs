const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const controllerSource = fs.readFileSync(
  path.join(projectRoot, "lib", "game-session", "useGameSessionController.ts"),
  "utf8",
);

assert.match(
  controllerSource,
  /from "@\/utils\/appRoutes"/,
  "expected the finish-game controller to use the shared app route constants",
);

// buildHomeRoute() rather than raw APP_ROUTES.home: scripts/home-route-canonical-navigation.test.cjs
// enforces that convention across every screen that navigates home, so web links
// do not retain stale query params.
assert.match(
  controllerSource,
  /args\.router\.replace\(buildHomeRoute\(\)\);/g,
  "expected successful finish-game navigation to target the canonical Command route",
);

assert.doesNotMatch(
  controllerSource,
  /args\.router\.replace\(\"\/\"\);/,
  "expected the finish-game controller to stop using a raw slash redirect for the post-save path",
);

console.log("finish-game-command-redirect.test.cjs passed");
