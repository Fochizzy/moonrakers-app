const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "charts", "index.tsx"),
  "utf8",
);

assert.match(
  source,
  /const\s+\[comparePlayerSearch,\s*setComparePlayerSearch\]\s*=\s*useState\(""\)/,
  "expected the charts setup screen to track a local comparePlayerSearch state",
);

assert.match(
  source,
  /const\s+deferredComparePlayerSearch\s*=\s*useDeferredValue\(comparePlayerSearch\);/,
  "expected the charts setup screen to defer compare-player search work while typing",
);

assert.match(
  source,
  /const\s+filteredComparePlayerOptions\s*=\s*useMemo\(\(\)\s*=>[\s\S]*deferredComparePlayerSearch[\s\S]*comparePlayerOptions\.filter/s,
  "expected the charts setup screen to derive filtered compare-player search results",
);

assert.match(
  source,
  /const\s+comparePlayerSearchItems\s*=\s*useMemo\(\s*\(\)\s*=>[\s\S]*filteredComparePlayerOptions\.map\(\(option\)\s*=>\s*\(\{[\s\S]*id:\s*String\(option\.key\),[\s\S]*label:\s*option\.label/s,
  "expected the compare-player search results to be adapted into PlayerSearchPicker items",
);

const routeSyncEffectMatch = source.match(
  /useEffect\(\(\)\s*=>\s*\{[\s\S]*?if\s*\(!setupOpen\)\s*return;[\s\S]*?replaceChartHubRoute\(selectedChart,\s*true\);[\s\S]*?\n\s*\]\);/s,
);

assert.ok(
  routeSyncEffectMatch,
  "expected setup-open player selection changes to sync route params so focus and compare taps stay selected",
);

const routeSyncEffect = routeSyncEffectMatch[0];

assert.ok(
  routeSyncEffect.includes("selectedPlayer?.key"),
  "expected the setup-open route sync effect to react to focus-player changes",
);

assert.ok(
  routeSyncEffect.includes("comparePlayer?.key"),
  "expected the setup-open route sync effect to react to compare-player changes",
);

assert.ok(
  routeSyncEffect.includes("setupOpen"),
  "expected the setup-open route sync effect to stay gated behind the open setup state",
);

assert.match(
  source,
  /function\s+handleComparePlayerSelect\(nextComparePlayerId:\s*string\)\s*\{[\s\S]*setComparePlayerId\(nextComparePlayerId\);[\s\S]*setComparePlayerSearch\(""\);[\s\S]*\}/,
  "expected compare-player selection to clear the search query after a choice is made",
);

assert.match(
  source,
  /<SetupSection[\s\S]*title="Compare player"[\s\S]*contentStyle=\{styles\.setupFullWidthSectionContent\}[\s\S]*<SetupTabs[\s\S]*items=\{comparePlayerOptions\}[\s\S]*onChange=\{handleComparePlayerSelect\}[\s\S]*<PlayerSearchPicker[\s\S]*query=\{comparePlayerSearch\}[\s\S]*placeholder="Search player here"[\s\S]*items=\{comparePlayerSearchItems\}[\s\S]*showResultsOnlyWhenQuery/s,
  "expected the Compare player section to keep its searchable player row in a full-width setup layout",
);

console.log("chart-compare-player-search.test.cjs passed");
