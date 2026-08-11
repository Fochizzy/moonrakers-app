const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "stats.tsx"),
  "utf8"
);

assert.match(
  source,
  /from "expo-router"/,
  "expected the stats screen to import expo-router for Command navigation"
);

assert.match(
  source,
  /from "@\/utils\/appRoutes"/,
  "expected the stats screen to import the shared app route helpers for Command navigation"
);

assert.match(
  source,
  /eyebrow="Statistics"/,
  "expected the stats screen to keep a compact top card with the Statistics eyebrow"
);

assert.match(
  source,
  /style=\{styles\.headerCard\}/,
  "expected the stats hero card to use the tighter compact spacing treatment"
);

// buildHomeRoute() is the canonical Command navigation across every screen —
// see scripts/home-route-canonical-navigation.test.cjs. Raw APP_ROUTES.home
// leaves stale query params on web links.
assert.match(
  source,
  /router\.push\(buildHomeRoute\(\)\)/,
  "expected the stats screen to keep the shared canonical Command navigation path"
);

assert.match(
  source,
  /title="Command"/,
  "expected the stats screen to keep the Command control visible"
);

assert.match(
  source,
  /style=\{styles\.commandActionButton\}/,
  "expected the stats screen to keep the smaller Command return button styling"
);

assert.doesNotMatch(
  source,
  /sourceKind=\{freshness\.sourceKind\}|sourceLabel=\{freshness\.sourceLabel\}/,
  "expected the stats screen to remove the source badge pill chrome from its section headers"
);

assert.ok(
  !source.includes("Mission Snapshot"),
  "expected the old Mission Snapshot hero copy to be removed from the stats screen"
);

assert.match(
  source,
  /hiddenOverviewCardKeys = new Set\(\["players", "games", "takeaway"\]\)/,
  "expected the stats overview to filter the removed players, games, and takeaway pills from any server-authored overview card payload"
);

console.log("stats-command-link.test.cjs passed");
