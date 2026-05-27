const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "insights.tsx"),
  "utf8",
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
  /placeholder:\s*"Search players"/,
  "expected a Search players input to stay wired into the Personal Correlations control rail",
);

assert.match(
  source,
  /<AnalyticsControlRail[\s\S]*search=\{\s*activeSectionTab === "pairingCorrelations"[\s\S]*query:\s*playerSearchQuery,[\s\S]*onQueryChange:\s*setPlayerSearchQuery,[\s\S]*items:\s*filteredPlayerOptions\.map\(\(player\)\s*=>[\s\S]*selectedIds:\s*selectedProfileId \? \[selectedProfileId\] : \[\],[\s\S]*onSelect:\s*\(id\)\s*=>\s*setSelectedProfileId\(id\),[\s\S]*variant:\s*"list"/,
  "expected Personal Correlations to drive the shared player search picker from the selected profile state",
);

assert.match(
  source,
  /badge:\s*player\.id === authProfileId\s*\?\s*"You"\s*:\s*null/,
  "expected the Personal Correlations picker to badge the signed-in player as You",
);

assert.match(
  source,
  /buildPlayerOptionMeta\(player,\s*authProfileId\)/,
  "expected the Personal Correlations picker to derive secondary text through the shared signed-in-safe meta helper",
);

console.log("insights-personal-correlations-search.test.cjs passed");
