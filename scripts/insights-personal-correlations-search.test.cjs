const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "insights.tsx"),
  "utf8",
);

assert.match(
  source,
  /TextInput/,
  "expected the insights route to import a TextInput for the personal correlations player search",
);

assert.match(
  source,
  /const \[selectedProfileId,\s*setSelectedProfileId\] = useState<string \| null>\(null\);/,
  "expected the insights route to track the selected profile for Personal Correlations",
);

assert.match(
  source,
  /const \[playerSearchQuery,\s*setPlayerSearchQuery\] = useState\(""\);/,
  "expected the insights route to track a player search query for Personal Correlations",
);

assert.match(
  source,
  /const deferredPlayerSearchQuery = useDeferredValue\(playerSearchQuery\);/,
  "expected the Personal Correlations search to defer filtering work while typing",
);

assert.match(
  source,
  /setSelectedProfileId\(\(current\) => current \?\? authProfileId \?\? null\);/,
  "expected Personal Correlations to default the selected profile to the signed-in user",
);

assert.match(
  source,
  /getInsightsScreen\(\{\s*profileId:\s*activeProfileId,\s*\}\)/,
  "expected the insights RPC call to follow the selected Personal Correlations profile",
);

assert.match(
  source,
  /placeholder="Search players"/,
  "expected a Search players input above the Personal Correlations panel",
);

assert.match(
  source,
  /activeSectionTab === "pairingCorrelations"[\s\S]*selectedProfileId === player\.id[\s\S]*onPress=\{\(\) => setSelectedProfileId\(player\.id\)\}/,
  "expected Personal Correlations to render selectable player search results above the pairing panel",
);

console.log("insights-personal-correlations-search.test.cjs passed");
