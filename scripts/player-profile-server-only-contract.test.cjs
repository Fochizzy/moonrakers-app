const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "player-profile", "[playerId].tsx"),
  "utf8",
);

assert.doesNotMatch(
  source,
  /buildLocalPlayerProfileFallback/,
  "expected the player profile route to stop rebuilding recent games and Moonrakers intel locally once the Supabase profile contract ships them directly",
);

assert.doesNotMatch(
  source,
  /buildSummary as buildFallbackSummary|buildSectionCards|buildInsight as buildFallbackInsight/,
  "expected the player profile route to stop synthesizing fallback ELO metric sections once the server tab payload is authoritative",
);

assert.doesNotMatch(
  source,
  /const localProfileFallback = useMemo\(/,
  "expected the player profile route to stop computing a local analytics fallback bundle",
);

assert.match(
  source,
  /const recentGames = toArray\(payload\?\.recentGames\);/,
  "expected the player profile route to read recent games directly from the published profile payload",
);

assert.match(
  source,
  /const moonrakersIntel = payload\?\.moonrakersIntel;/,
  "expected the player profile route to pass through the published Moonrakers intel payload directly",
);

console.log("player-profile-server-only-contract.test.cjs passed");
