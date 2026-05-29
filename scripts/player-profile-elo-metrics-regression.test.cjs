const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "player-profile", "[playerId].tsx"),
  "utf8",
);

assert.match(
  source,
  /const profileStickyHeaderIndices = Platform\.OS === "android" \? undefined : \[3\];/,
  "expected the player profile screen to keep the profile tab rail at sticky index 3 while disabling the native sticky rail on Android",
);

assert.match(
  source,
  /stickyHeaderIndices=\{profileStickyHeaderIndices\}/,
  "expected only the profile tab rail shell to stay sticky through the shared sticky-header configuration",
);

assert.doesNotMatch(
  source,
  /stickyHeaderIndices=\{\[4\]\}/,
  "expected the player profile screen to stop pinning the metric card stack as the sticky header",
);

assert.match(
  source,
  /buildSummary as buildFallbackSummary|buildSectionCards as buildFallbackSectionCards|buildInsight as buildFallbackInsight/,
  "expected the player profile route to keep the shared local ELO fallback builders available for empty published profiles",
);

assert.match(
  source,
  /const fallbackSection = useMemo\(/,
  "expected the player profile route to compute a local fallback metrics section for empty published profiles",
);

assert.match(
  source,
  /buildPlayerProfileMetricPresentation\(/,
  "expected the player profile route to build a tab-aware metric presentation instead of reusing one static profile view across every tab",
);

assert.match(
  source,
  /sectionCards=\{metricPresentation\.sectionCards\}/,
  "expected the player profile route to render the tab-aware metric grid produced by the presentation helper",
);

assert.match(
  source,
  /signalsTitle=\{metricPresentation\.signalsTitle\}/,
  "expected the player profile route to feed a tab-aware signals heading into the shared metric tabs component",
);

console.log("player-profile-elo-metrics-regression.test.cjs passed");
