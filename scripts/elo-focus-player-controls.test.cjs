const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "elo.tsx"),
  "utf8",
);

assert.match(
  source,
  /useDeferredValue/,
  "expected the Elo screen to defer player-search filtering work while typing",
);

assert.match(
  source,
  /TextInput/,
  "expected the Elo screen to import a TextInput for focus-player search",
);

assert.match(
  source,
  /useRouter/,
  "expected the Elo screen to import expo-router navigation for the Command shortcut",
);

assert.match(
  source,
  /from "@\/utils\/appRoutes"/,
  "expected the Elo screen to import the shared app route helpers for Command navigation",
);

assert.match(
  source,
  /resolvePreferredChartPlayerId/,
  "expected the Elo screen to reuse the shared chart focus-player resolver",
);

assert.match(
  source,
  /const authSession = useAuthSession\(\);/,
  "expected the Elo screen to read the signed-in auth session from the store",
);

assert.match(
  source,
  /const authProfile = useAuthProfile\(\);/,
  "expected the Elo screen to read the signed-in auth profile from the store",
);

assert.match(
  source,
  /const \[playerSearchQuery,\s*setPlayerSearchQuery\] = useState\(""\);/,
  "expected the Elo screen to track a player search query",
);

assert.match(
  source,
  /const deferredPlayerSearchQuery = useDeferredValue\(playerSearchQuery\);/,
  "expected the Elo screen to defer the player search query",
);

assert.match(
  source,
  /const preferredPlayerId = useMemo\([\s\S]*resolvePreferredChartPlayerId\(\{[\s\S]*availablePlayers:\s*analyticsPlayers,[\s\S]*authProfileId:\s*authProfile\?\.id,[\s\S]*authSessionUserId:\s*authSession\?\.user\?\.id,[\s\S]*\}\)/s,
  "expected the Elo screen to derive its default focus player from the signed-in user",
);

assert.match(
  source,
  /if \(!activeId \|\| !hasActivePlayer\) \{\s*setSelectedPlayerId\(preferredPlayerId \?\? normalizeId\(analyticsPlayers\[0\]\?\.id\)\);\s*\}/s,
  "expected the Elo screen to default the selected player to the preferred signed-in player before falling back",
);

assert.match(
  source,
  /placeholder="Search players"/,
  "expected a Search players input above the Elo quick-select names",
);

assert.match(
  source,
  /router\.push\(buildHomeRoute\(\)\)/,
  "expected the Elo screen to route Command to the shared Command page",
);

assert.match(
  source,
  /Command/,
  "expected the Elo screen to show a Command control",
);

console.log("elo-focus-player-controls.test.cjs passed");
