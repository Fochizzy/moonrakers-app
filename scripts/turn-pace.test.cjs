const assert = require("node:assert/strict");

require("./support/ts-require.cjs");

const { buildGamePace, formatDuration } = require("../utils/turnPace.ts");

const players = [
  { id: "p1", name: "Izzy" },
  { id: "p2", name: "Greg" },
];

const MINUTE = 60_000;

// Fewer than two timestamped turns cannot produce a gap.
assert.equal(buildGamePace([], players), null, "expected null pace with no rounds");
assert.equal(
  buildGamePace([{ playerId: "p1", createdAt: 1000, metaType: "main" }], players),
  null,
  "expected null pace from a single turn",
);

// Rounds without usable timestamps are ignored rather than counted as zero.
assert.equal(
  buildGamePace(
    [
      { playerId: "p1", createdAt: null, metaType: "main" },
      { playerId: "p2", createdAt: 0, metaType: "main" },
    ],
    players,
  ),
  null,
  "expected null pace when timestamps are missing",
);

const start = 1_700_000_000_000;
const pace = buildGamePace(
  [
    { playerId: "p1", createdAt: start, metaType: "main" },
    { playerId: "p2", createdAt: start + 2 * MINUTE, metaType: "main" },
    // Linked bonus rounds share a turn and must not count as their own turn.
    { playerId: "p1", createdAt: start + 2 * MINUTE + 500, metaType: "bonusObjective", linkedTurnId: "x" },
    { playerId: "p1", createdAt: start + 6 * MINUTE, metaType: "main" },
    { playerId: "p2", createdAt: start + 8 * MINUTE, metaType: "main" },
  ],
  players,
);

assert.ok(pace, "expected a pace result");
assert.equal(pace.gameDurationMs, 8 * MINUTE, "expected first-to-last turn duration");
assert.equal(pace.measuredTurns, 3, "expected only main-round gaps to be measured");
assert.equal(pace.medianTurnMs, 2 * MINUTE, "expected the median gap");
assert.equal(pace.longestTurnMs, 4 * MINUTE, "expected the longest gap");

const izzy = pace.players.find((player) => player.playerId === "p1");
const greg = pace.players.find((player) => player.playerId === "p2");
assert.equal(izzy.turns, 1, "expected one measured turn for the second-seat player");
assert.equal(izzy.medianTurnMs, 4 * MINUTE, "expected the slow turn to belong to p1");
assert.equal(greg.turns, 2, "expected two measured turns for p2");
assert.equal(
  pace.players[0].playerId,
  "p1",
  "expected players sorted slowest median first",
);
assert.ok(
  Math.abs(izzy.tableShare + greg.tableShare - 1) < 1e-9,
  "expected table share to sum to 1",
);

// Out-of-order rounds are sorted before gaps are measured.
const unordered = buildGamePace(
  [
    { playerId: "p2", createdAt: start + 3 * MINUTE, metaType: "main" },
    { playerId: "p1", createdAt: start, metaType: "main" },
  ],
  players,
);
assert.equal(unordered.medianTurnMs, 3 * MINUTE, "expected rounds to be sorted by time");

assert.equal(formatDuration(45_000), "45s");
assert.equal(formatDuration(3 * MINUTE + 20_000), "3m 20s");
assert.equal(formatDuration(60 * MINUTE), "1h");
assert.equal(formatDuration(72 * MINUTE), "1h 12m");
assert.equal(formatDuration(-5), "0s");

console.log("turn-pace.test.cjs passed");
