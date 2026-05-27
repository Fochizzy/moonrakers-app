const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "player-profile", "[playerId].tsx"),
  "utf8",
);

assert.match(
  source,
  /buildCommonOpponentOptions\(\{[\s\S]*playerId:\s*resolvedPlayerId,\s*players:\s*sortedPlayers as any,\s*games:\s*games as any,\s*limit:\s*4[\s\S]*\}\)/,
  "expected Context Matchup to derive a top-four shared-opponent strip for the selected player",
);

assert.match(
  source,
  /const \[opponentSearchQuery,\s*setOpponentSearchQuery\] = useState\(""\);/,
  "expected the player profile screen to track a local opponent search query",
);

assert.match(
  source,
  /const deferredOpponentSearchQuery = useDeferredValue\(opponentSearchQuery\);/,
  "expected the player profile screen to defer opponent search filtering work",
);

assert.match(
  source,
  /<Pressable[\s\S]*setSelectedOpponentId\(null\)[\s\S]*>[\s\S]*All[\s\S]*<\/Pressable>[\s\S]*\{topOpponentOptions\.map\(/s,
  "expected Context Matchup to render All first and then the top shared opponents",
);

assert.match(
  source,
  /placeholder="Search opponents"/,
  "expected Context Matchup to place an opponent search bar underneath the quick chips",
);

assert.match(
  source,
  /opponentSearchQuery\.trim\(\)\s*\?\s*\([\s\S]*filteredOpponentOptions\.map\(/,
  "expected Context Matchup to render filtered opponent results from the search bar",
);

console.log("player-profile-context-matchup.test.cjs passed");
