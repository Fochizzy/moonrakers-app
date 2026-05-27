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

assert.doesNotMatch(
  source,
  /buildSummary as buildFallbackSummary|buildSectionCards|buildInsight as buildFallbackInsight/,
  "expected the player profile route to stop importing the local ELO fallback builders once the server tab payload is authoritative",
);

assert.doesNotMatch(
  source,
  /const fallbackSection = useMemo\(/,
  "expected the player profile route to stop computing a local fallback metrics section",
);

assert.match(
  source,
  /sectionCards=\{sectionCards\}/,
  "expected the player profile route to render the published server section cards directly",
);

console.log("player-profile-elo-metrics-regression.test.cjs passed");
