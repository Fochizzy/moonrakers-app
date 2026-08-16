const assert = require("node:assert/strict");

require("./support/ts-require.cjs");

const { buildGameResultShareText } = require("../utils/shareGameResult.ts");

const text = buildGameResultShareText({
  gameTitle: "Thursday Crew",
  playedAt: "12 Aug 2026",
  groupName: "Thursday Crew",
  winnerName: "Izzy",
  roundsCount: 9,
  durationLabel: "1h 12m",
  standings: [
    { name: "Izzy", totalPrestige: 42, contracts: 6, assists: 3, failures: 1 },
    { name: "Greg", totalPrestige: 38, contracts: 5, assists: 0, failures: 0 },
  ],
});

assert.match(text, /^Moonrakers - Thursday Crew/, "expected a titled first line");
assert.match(text, /9 rounds/, "expected the round count in the meta line");
assert.match(text, /1h 12m/, "expected the game length in the meta line");
assert.match(text, /Winner: Izzy/, "expected the winner called out");
assert.match(text, /1\. Izzy - 42 prestige \(6c 3a 1f\)/, "expected a ranked standings line");
assert.match(
  text,
  /2\. Greg - 38 prestige \(5c\)/,
  "expected zero-valued detail to be dropped rather than printed as 0",
);

// A game with no extras still produces something sendable.
const minimal = buildGameResultShareText({
  gameTitle: "",
  standings: [{ name: "", totalPrestige: 0 }],
});
assert.match(minimal, /^Moonrakers - Moonrakers/, "expected a fallback title");
assert.match(minimal, /1\. Unknown - 0 prestige/, "expected a fallback player name");
assert.ok(!minimal.includes("Winner:"), "expected no winner line when none is known");

console.log("share-game-result.test.cjs passed");
