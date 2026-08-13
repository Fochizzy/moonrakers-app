const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function patchedResolveFilename(
  request,
  parent,
  isMain,
  options,
) {
  if (request.startsWith("@/")) {
    request = path.join(projectRoot, request.slice(2));
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(mod, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        allowJs: true,
      },
      fileName: filename,
    });

    mod._compile(outputText, filename);
  };
}

// ---------------------------------------------------------------------------
// Supabase replay is the authority; assert the migration encodes the new blend.
// ---------------------------------------------------------------------------

const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260813240000_moonrakers_elo_trajectory_closeness.sql",
);
const migrationSource = fs.readFileSync(migrationPath, "utf8");

assert.match(
  migrationSource,
  /select avg\(abs\(value - prestige_mean\)\) into prestige_spread/,
  "expected closeness to read the whole field's spread, not the top-two gap",
);

// --- the reliability gate ---------------------------------------------------

assert.match(
  migrationSource,
  /game_trust as \([\s\S]*?coalesce\(gp\.total_prestige, 0\)::numeric\s*- coalesce\(pp\.replayed_prestige, 0\)\s*\)\) < 0\.5 as trustworthy/,
  "expected a game's rounds to be trusted only when they reproduce its stored prestige",
);

assert.match(
  migrationSource,
  /join game_trust as gt\s*on gt\.game_id = gp\.game_id\s*and gt\.trustworthy/,
  "expected the turn grid to exclude games whose rounds cannot be trusted",
);

// --- trajectory closeness ---------------------------------------------------

assert.match(
  migrationSource,
  /when count\(\*\) filter \(where running_prestige = leading_prestige\) = 1/,
  "expected only strict leads to count, so shared opening turns invent no lead changes",
);

assert.match(
  migrationSource,
  /max\(case\s*when leader is not null and leader <> final_leader\s*then turn_no::numeric \/ turns_total/,
  "expected settled_at to be how far through the game the lead last changed",
);

assert.match(
  migrationSource,
  /when game_rec\.settled_at is null then spread_decisive/,
  "expected games without a trustworthy trajectory to fall back to spread alone",
);

assert.match(
  migrationSource,
  /\(spread_decisive \+ \(1::numeric - game_rec\.settled_at\)\) \/ 2/,
  "expected decisiveness to blend the final spread with how early the game settled",
);

assert.doesNotMatch(
  migrationSource,
  /top_prestige|runner_up_prestige/,
  "expected the top-two margin measure to be gone entirely",
);

assert.match(
  migrationSource,
  /select array_agg\(\(n - tied\.position\) \/ \(n - 1\)::numeric order by tied\.ord\)/,
  "expected the result base to come from finishing position, not a binary win",
);

assert.match(
  migrationSource,
  /avg\(ranked\.pos\) over \(\s*partition by ranked\.is_winner, ranked\.prestige, ranked\.end_score\s*\)/,
  "expected players level on prestige and end score to share an averaged position",
);

assert.match(
  migrationSource,
  /base_actual := coalesce\(result_bases\[i\], 0\.5\);/,
  "expected the per-player result base to drive the actual score",
);

assert.match(
  migrationSource,
  /elo_result_weight constant numeric := 0\.6;[\s\S]*elo_performance_weight constant numeric := 0\.4;/,
  "expected the win/loss result to keep its 0.6 share and performance to hold 0.4",
);

assert.match(
  migrationSource,
  /performance_signal := \(flow_norm \+ prestige_norm \+ end_norm\) \/ 3\.0;/,
  "expected flow, total prestige, and end score to contribute equally to performance",
);

assert.match(
  migrationSource,
  /row_number\(\) over \(\s*partition by game_id, participant_id order by round_index\s*\)::numeric as turn_weight/,
  "expected each turn to carry a weight equal to its position, so later turns count more",
);

assert.match(
  migrationSource,
  /sum\(standing \* turn_weight\) \/ nullif\(sum\(turn_weight\), 0\) as flow_score/,
  "expected flow to be the turn-weighted average of each player's standing",
);

assert.match(
  migrationSource,
  /turn_grid as \(/,
  "expected a full turn grid so players who did not act carry their total forward",
);

assert.match(
  migrationSource,
  /elo_min_swing constant numeric := 0\.75;[\s\S]*elo_max_swing constant numeric := 1\.25;/,
  "expected the rating swing to scale between 0.75x and 1.25x",
);

assert.match(
  migrationSource,
  /\(coalesce\(prestige_spread, 0\) \/ prestige_mean\) \/ elo_decisive_spread_ratio/,
  "expected decisiveness to come from the field spread relative to the table average",
);

assert.match(
  migrationSource,
  /delta_val := round\(effective_k \* \(actual_s - expected\)\)::int;/,
  "expected the closeness-scaled K to drive the rating delta",
);

assert.match(
  migrationSource,
  /flow_norm     := coalesce\(game_rec\.flow_scores\[i\], end_norm\);/,
  "expected games without round rows to fall back to the end-score standing",
);

assert.match(
  migrationSource,
  /select private\.refresh_all_elo_snapshots\(\);/,
  "expected the migration to recalculate every published rating",
);

// ---------------------------------------------------------------------------
// Client mirror behaviour.
// ---------------------------------------------------------------------------

const {
  BASE_ELO,
  ELO_RESULT_WEIGHT,
  ELO_PERFORMANCE_WEIGHT,
  ELO_MIN_SWING_MULTIPLIER,
  ELO_MAX_SWING_MULTIPLIER,
  buildActualScores,
  buildFieldSpreadDecisiveness,
  buildFlowScores,
  buildGameDecisiveness,
  buildRunningPrestige,
  buildSettledAt,
  roundsReconcile,
  buildPerformanceSignals,
  buildRatingHistory,
  buildRunningScores,
  buildResultScores,
  buildSwingMultiplier,
  calculateElo,
  eloFieldStanding,
} = require(path.join(projectRoot, "utils", "elo.ts"));

// --- the result base is finishing position, and it is zero-sum --------------

function sumOf(record) {
  return Number(
    Object.values(record)
      .reduce((total, value) => total + value, 0)
      .toFixed(8),
  );
}

const twoPlayer = {
  winnerId: "a",
  totals: { a: { totalPrestige: 20, score: 25 }, b: { totalPrestige: 10, score: 12 } },
};
const fourPlayer = {
  winnerId: "a",
  totals: {
    a: { totalPrestige: 30, score: 35 },
    b: { totalPrestige: 20, score: 24 },
    c: { totalPrestige: 18, score: 22 },
    d: { totalPrestige: 12, score: 15 },
  },
};

assert.deepEqual(
  buildResultScores(twoPlayer, ["a", "b"]),
  { a: 1, b: 0 },
  "expected a two-player game to keep the familiar 1 and 0",
);

assert.deepEqual(
  buildResultScores(fourPlayer, ["a", "b", "c", "d"]),
  { a: 1, b: 2 / 3, c: 1 / 3, d: 0 },
  "expected four places to share the gap evenly",
);

// Players level on prestige and end score must not be separated by sort order.
assert.deepEqual(
  buildResultScores(
    {
      winnerId: "a",
      totals: {
        a: { totalPrestige: 30, score: 35 },
        b: { totalPrestige: 20, score: 24 },
        c: { totalPrestige: 20, score: 24 },
        d: { totalPrestige: 12, score: 15 },
      },
    },
    ["a", "b", "c", "d"],
  ),
  { a: 1, b: 0.5, c: 0.5, d: 0 },
  "expected a tie for second to share the average of second and third",
);

// The recorded winner takes first even when tied, so a manual pick still counts.
assert.deepEqual(
  buildResultScores(
    {
      winnerId: "b",
      totals: {
        a: { totalPrestige: 20, score: 25 },
        b: { totalPrestige: 20, score: 25 },
        c: { totalPrestige: 10, score: 12 },
      },
    },
    ["a", "b", "c"],
  ),
  { a: 0.5, b: 1, c: 0 },
  "expected a manually resolved prestige tie to award the win outright",
);

// This is the property that stops rating leaking: bases and actual scores must
// both sum to n/2, which is exactly what the expected scores sum to.
for (const [game, ids] of [
  [twoPlayer, ["a", "b"]],
  [fourPlayer, ["a", "b", "c", "d"]],
  [
    {
      winnerId: null,
      totals: {
        a: { totalPrestige: 20, score: 25 },
        b: { totalPrestige: 20, score: 25 },
        c: { totalPrestige: 10, score: 12 },
      },
    },
    ["a", "b", "c"],
  ],
]) {
  assert.equal(
    sumOf(buildResultScores(game, ids)),
    ids.length / 2,
    "expected the result bases to sum to n/2",
  );
  assert.equal(
    sumOf(buildActualScores(game, ids)),
    ids.length / 2,
    "expected the actual scores to sum to n/2, leaving the game zero-sum",
  );
}

// End to end: a multiplayer game must neither create nor destroy rating.
//
// The exact invariant lives on the unrounded scores asserted above - those sum
// to n/2 on both sides, so the deltas cancel perfectly. Published ratings round
// each delta to a whole number, which can leave a residue of well under a point
// per player. The tolerance below is tight enough to catch the old systematic
// drain (about 19 points per four-player game) while allowing that rounding.
for (const size of [2, 3, 4, 5]) {
  const ids = ["a", "b", "c", "d", "e"].slice(0, size);
  const totals = Object.fromEntries(
    ids.map((id, index) => [
      id,
      { totalPrestige: 20 - index * 3, score: 30 - index * 5 },
    ]),
  );
  const ratings = calculateElo([
    { id: `zero-sum-${size}`, createdAt: 1, winnerId: "a", totals },
  ]);
  const drift = Math.abs(
    Object.values(ratings).reduce((total, value) => total + value, 0) -
      size * BASE_ELO,
  );

  assert.ok(
    drift <= size / 2,
    `expected a ${size}-player game to conserve total rating, drifted ${drift}`,
  );
}

assert.equal(ELO_RESULT_WEIGHT, 0.6, "expected the result weight to be 0.6");
assert.equal(ELO_PERFORMANCE_WEIGHT, 0.4, "expected the performance weight to be 0.4");
assert.equal(
  ELO_RESULT_WEIGHT + ELO_PERFORMANCE_WEIGHT,
  1,
  "expected the result and performance weights to cover the whole actual score",
);

function round(value, places = 4) {
  return Number(value.toFixed(places));
}

// --- the standing is a differential against the rest of the field -----------

assert.equal(
  eloFieldStanding(10, 10, 2),
  0.5,
  "expected a player level with the field to read 0.5",
);
assert.equal(
  round(eloFieldStanding(20, 15, 2)),
  0.8333,
  "expected 20 against an opponent on 10 to read as a clear lead",
);
assert.equal(
  round(eloFieldStanding(10, 15, 2)),
  0.1667,
  "expected the trailing side to mirror the leader",
);
assert.equal(
  eloFieldStanding(12, 10, 1),
  0.5,
  "expected a field of one to have no differential to read",
);
assert.equal(
  eloFieldStanding(5, 0, 3),
  0.5,
  "expected a field with no output yet to read as neutral",
);
assert.equal(
  eloFieldStanding(-40, 10, 2),
  0,
  "expected a runaway deficit to clamp at 0 rather than escape the range",
);

// A two-point win and a rout must not read the same.
assert.ok(
  eloFieldStanding(40, 22.5, 2) > eloFieldStanding(12, 11, 2),
  "expected a rout to out-read a narrow win",
);

// --- flow: same end totals, opposite trajectories ---------------------------

const endTotals = {
  a: { totalPrestige: 20, score: 25 },
  b: { totalPrestige: 18, score: 23 },
};

// `a` banks early and holds the lead the whole way.
const wireToWire = {
  id: "wire",
  createdAt: 1,
  winnerId: "a",
  totals: endTotals,
  rounds: [
    { playerId: "a", prestige: 14, contracts: 1 },
    { playerId: "b", prestige: 2, contracts: 1 },
    { playerId: "a", prestige: 6, contracts: 0 },
    { playerId: "b", prestige: 16, contracts: 0 },
  ],
};

// `a` trails early and only goes ahead late. Identical final totals.
const lateSteal = {
  id: "steal",
  createdAt: 1,
  winnerId: "a",
  totals: endTotals,
  rounds: [
    { playerId: "a", prestige: 2, contracts: 1 },
    { playerId: "b", prestige: 14, contracts: 1 },
    { playerId: "a", prestige: 18, contracts: 0 },
    { playerId: "b", prestige: 4, contracts: 0 },
  ],
};

assert.deepEqual(
  buildRunningScores(wireToWire, ["a", "b"]),
  { a: [19, 19, 25, 25], b: [0, 7, 7, 23] },
  "expected players who did not act on a turn to carry their total forward",
);

const wireFlow = buildFlowScores(wireToWire, ["a", "b"]);
const stealFlow = buildFlowScores(lateSteal, ["a", "b"]);

assert.ok(
  wireFlow.a > stealFlow.a,
  "expected leading wire to wire to out-score stealing it on the last turn",
);
assert.ok(
  wireFlow.b < stealFlow.b,
  "expected the player who led most of the way to out-score their own late collapse",
);
assert.equal(round(wireFlow.a), 0.809, "expected the wire-to-wire flow score to stay pinned");
assert.equal(round(stealFlow.a), 0.5153, "expected the late-steal flow score to stay pinned");

assert.ok(
  buildActualScores(wireToWire, ["a", "b"]).a >
    buildActualScores(lateSteal, ["a", "b"]).a,
  "expected flow to reach the actual score, not just the intermediate signal",
);

// Later turns must outweigh earlier ones. Both games below give `a` a lead of
// exactly the same size for exactly one turn, with the field level on every
// other turn and identical end totals - the only difference is when it happened.
const levelTotals = {
  a: { totalPrestige: 20, score: 20 },
  b: { totalPrestige: 20, score: 20 },
};

const earlyBurst = {
  winnerId: "a",
  totals: levelTotals,
  rounds: [
    { playerId: "a", prestige: 20 },
    { playerId: "b", prestige: 20 },
    { playerId: "a", prestige: 0 },
    { playerId: "b", prestige: 0 },
    { playerId: "a", prestige: 0 },
    { playerId: "b", prestige: 0 },
  ],
};

const lateBurst = {
  winnerId: "a",
  totals: levelTotals,
  rounds: [
    { playerId: "a", prestige: 0 },
    { playerId: "b", prestige: 0 },
    { playerId: "a", prestige: 0 },
    { playerId: "b", prestige: 0 },
    { playerId: "a", prestige: 20 },
    { playerId: "b", prestige: 20 },
  ],
};

assert.deepEqual(
  buildRunningScores(earlyBurst, ["a", "b"]).a,
  [20, 20, 20, 20, 20, 20],
  "expected the early burst to put `a` ahead on turn 1 only",
);
assert.deepEqual(
  buildRunningScores(lateBurst, ["a", "b"]).a,
  [0, 0, 0, 0, 20, 20],
  "expected the late burst to put `a` ahead on turn 5 only",
);

assert.ok(
  buildFlowScores(lateBurst, ["a", "b"]).a >
    buildFlowScores(earlyBurst, ["a", "b"]).a,
  "expected the same one-turn lead to count for more when it happens late",
);

// Games without round rows have no trajectory, so flow reads off the end scores.
const noRounds = {
  totals: { a: { totalPrestige: 20, score: 30 }, b: { totalPrestige: 10, score: 10 } },
};
assert.deepEqual(
  buildFlowScores(noRounds, ["a", "b"]),
  {
    a: eloFieldStanding(30, 20, 2),
    b: eloFieldStanding(10, 20, 2),
  },
  "expected legacy imports without rounds to fall back to the end-score standing",
);

// --- closeness: decisive games swing harder ---------------------------------

function marginGame(id, aPrestige, bPrestige) {
  return {
    id,
    createdAt: 1,
    winnerId: "a",
    totals: {
      a: { totalPrestige: aPrestige, score: aPrestige },
      b: { totalPrestige: bPrestige, score: bPrestige },
    },
  };
}

const photoFinish = marginGame("photo", 20, 20);
const narrow = marginGame("narrow", 21, 20);
const clear = marginGame("clear", 30, 20);
const rout = marginGame("rout", 40, 10);

assert.equal(
  buildGameDecisiveness(photoFinish, ["a", "b"]),
  0,
  "expected a dead-level prestige finish to read as maximally close",
);

// Closeness must read every finisher, not just the top two. These two games
// share an identical 1-prestige gap at the top but differ completely below it.
const tightAtTop = {
  winnerId: "a",
  totals: {
    a: { totalPrestige: 21, score: 21 },
    b: { totalPrestige: 20, score: 20 },
    c: { totalPrestige: 20, score: 20 },
    d: { totalPrestige: 19, score: 19 },
  },
};
const tightAtTopStrungOutBelow = {
  winnerId: "a",
  totals: {
    a: { totalPrestige: 21, score: 21 },
    b: { totalPrestige: 20, score: 20 },
    c: { totalPrestige: 6, score: 6 },
    d: { totalPrestige: 1, score: 1 },
  },
};

assert.ok(
  buildGameDecisiveness(tightAtTopStrungOutBelow, ["a", "b", "c", "d"]) >
    buildGameDecisiveness(tightAtTop, ["a", "b", "c", "d"]),
  "expected a strung-out field to out-read a bunched one despite the same top-two gap",
);
assert.ok(
  buildGameDecisiveness(tightAtTop, ["a", "b", "c", "d"]) < 0.2,
  "expected a table finishing within two prestige of each other to read as close",
);
assert.equal(
  buildSwingMultiplier(photoFinish, ["a", "b"]),
  ELO_MIN_SWING_MULTIPLIER,
  "expected the closest possible game to move ratings at the minimum multiplier",
);
assert.equal(
  buildGameDecisiveness(rout, ["a", "b"]),
  1,
  "expected a rout to read as fully decisive",
);
assert.equal(
  buildSwingMultiplier(rout, ["a", "b"]),
  ELO_MAX_SWING_MULTIPLIER,
  "expected a rout to move ratings at the maximum multiplier",
);

const swings = [photoFinish, narrow, clear, rout].map(
  (game) => buildSwingMultiplier(game, ["a", "b"]),
);
for (let index = 1; index < swings.length; index += 1) {
  assert.ok(
    swings[index] > swings[index - 1],
    "expected the swing multiplier to rise monotonically with the winning margin",
  );
}

const photoRatings = calculateElo([photoFinish]);
const routRatings = calculateElo([rout]);

assert.ok(
  routRatings.a - BASE_ELO > photoRatings.a - BASE_ELO,
  "expected a rout to gain more rating than a photo finish",
);
assert.ok(
  BASE_ELO - routRatings.b > BASE_ELO - photoRatings.b,
  "expected being routed to cost more rating than losing a photo finish",
);

// --- wins stay wins ---------------------------------------------------------

const outplayedWinner = calculateElo([
  {
    id: "outplayed",
    createdAt: 1,
    winnerId: "a",
    totals: {
      a: { totalPrestige: 11, score: 11 },
      b: { totalPrestige: 10, score: 38 },
    },
  },
]);

assert.ok(
  outplayedWinner.a > BASE_ELO,
  "expected a win to stay rating-positive even when the loser out-performed on score",
);
assert.ok(
  outplayedWinner.b < BASE_ELO,
  "expected a loss to stay rating-negative even when the loser out-performed on score",
);

// --- an even game is an even game -------------------------------------------

const evenSignals = buildPerformanceSignals(
  {
    totals: {
      a: { totalPrestige: 15, score: 20 },
      b: { totalPrestige: 15, score: 20 },
    },
  },
  ["a", "b"],
);

assert.equal(round(evenSignals.a), 0.5, "expected identical output to read as a neutral 0.5");
assert.equal(round(evenSignals.b), 0.5, "expected identical output to read as a neutral 0.5");

// --- history stays in step with the final ratings ---------------------------

const seriesGames = [
  marginGame("series-1", 24, 20),
  { ...marginGame("series-2", 18, 26), createdAt: 2, winnerId: "b" },
];

const finalRatings = calculateElo(seriesGames);
const ratingHistory = buildRatingHistory(seriesGames);

assert.equal(
  ratingHistory.a.at(-1)?.rating,
  finalRatings.a,
  "expected rating history to finish on the same final rating as calculateElo for player a",
);
assert.equal(
  ratingHistory.b.at(-1)?.rating,
  finalRatings.b,
  "expected rating history to finish on the same final rating as calculateElo for player b",
);

// ---------------------------------------------------------------------------
// Parity anchors.
//
// These are the exact numbers private.refresh_all_elo_snapshots() must also
// produce for the equivalent rows, so the server replay and this client mirror
// can be diffed directly. The assist game routes 6 assist prestige from `a` to
// `b` on turn 0, so `b`'s running score moves on a turn they did not act.
// ---------------------------------------------------------------------------

const assistGame = {
  id: "parity-assist",
  createdAt: 2,
  winnerId: "c",
  totals: {
    a: { totalPrestige: 10, score: 18 },
    b: { totalPrestige: 6, score: 6 },
    c: { totalPrestige: 20, score: 25 },
  },
  rounds: [
    {
      playerId: "a",
      prestige: 10,
      contracts: 1,
      failures: 0,
      assistRecipients: { b: 1 },
      assistPrestigeRecipients: { b: 6 },
    },
    { playerId: "b", prestige: 0, contracts: 0, failures: 0 },
    { playerId: "c", prestige: 20, contracts: 1, failures: 0 },
  ],
};

assert.deepEqual(
  buildRunningScores(assistGame, ["a", "b", "c"]),
  { a: [18, 18, 18], b: [6, 6, 6], c: [0, 0, 25] },
  "expected assist prestige to move the recipient's running score on the giver's turn",
);

assert.equal(
  round(buildActualScores(wireToWire, ["a", "b"]).a, 6),
  0.85377,
  "expected the wire-to-wire winner's blended actual score to stay pinned",
);

assert.deepEqual(
  calculateElo([wireToWire]),
  { a: 1012, b: 988 },
  "expected the wire-to-wire replay to land on 1012/988",
);

assert.deepEqual(
  calculateElo([wireToWire, assistGame]),
  { a: 1012, b: 973, c: 1014 },
  "expected the two-game replay to land on 1012/973/1014",
);

const seriesRatings = calculateElo([wireToWire, assistGame]);
const seriesDrift = Math.abs(
  Object.values(seriesRatings).reduce((total, value) => total + value, 0) -
    3 * BASE_ELO,
);

assert.ok(
  seriesDrift <= 2,
  `expected a two-game series to conserve total rating, drifted ${seriesDrift}`,
);

// ---------------------------------------------------------------------------
// The reliability gate.
//
// Every game recorded on 2026-04-01 and 2026-04-03 kept its turn rows but
// carries prestige 0 on all of them, so replaying those produces a trajectory
// that is wrong rather than merely imprecise. The information was never
// captured and cannot be recovered from the totals, so the gate detects those
// games instead of pretending to reconstruct them.
// ---------------------------------------------------------------------------

const reconcilingGame = {
  winnerId: "a",
  totals: { a: { totalPrestige: 20, score: 20 }, b: { totalPrestige: 12, score: 12 } },
  rounds: [
    { playerId: "a", prestige: 10 },
    { playerId: "b", prestige: 4 },
    { playerId: "a", prestige: 10 },
    { playerId: "b", prestige: 8 },
  ],
};

// The legacy signature: turn rows present, prestige stripped off them.
const legacyGame = {
  winnerId: "a",
  totals: { a: { totalPrestige: 20, score: 20 }, b: { totalPrestige: 12, score: 12 } },
  rounds: [
    { playerId: "a", prestige: 0, contracts: 1 },
    { playerId: "b", prestige: 0, contracts: 1 },
    { playerId: "a", prestige: 0 },
    { playerId: "b", prestige: 0 },
  ],
};

assert.equal(
  roundsReconcile(reconcilingGame, ["a", "b"]),
  true,
  "expected rounds that reproduce the stored prestige to be trusted",
);
assert.equal(
  roundsReconcile(legacyGame, ["a", "b"]),
  false,
  "expected rounds that lost their prestige to be rejected",
);
assert.equal(
  roundsReconcile(noRounds, ["a", "b"]),
  false,
  "expected a game with no rounds at all to have nothing to trust",
);

assert.deepEqual(
  buildRunningPrestige(reconcilingGame, ["a", "b"]),
  { a: [10, 10, 20, 20], b: [0, 4, 4, 12] },
  "expected the prestige trail to track the win condition, not the score",
);

// An untrustworthy trajectory must not reach the rating. Flow falls back to the
// end-score standing, exactly as a game with no rounds would.
assert.deepEqual(
  buildFlowScores(legacyGame, ["a", "b"]),
  buildFlowScores({ totals: legacyGame.totals }, ["a", "b"]),
  "expected a gated game to score flow exactly as if it had no rounds",
);

assert.equal(
  buildSettledAt(legacyGame, ["a", "b"]),
  null,
  "expected a gated game to yield no trajectory closeness",
);
assert.equal(
  buildGameDecisiveness(legacyGame, ["a", "b"]),
  buildFieldSpreadDecisiveness(legacyGame, ["a", "b"]),
  "expected a gated game to fall back to the field spread alone",
);

// ---------------------------------------------------------------------------
// Trajectory closeness.
// ---------------------------------------------------------------------------

// `a` leads from the first turn and is never headed.
assert.equal(
  buildSettledAt(reconcilingGame, ["a", "b"]),
  0,
  "expected a wire-to-wire game to settle at the start",
);

// Same field, same finishing spread, but `b` leads until the closing turn.
const contested = {
  winnerId: "a",
  totals: { a: { totalPrestige: 20, score: 20 }, b: { totalPrestige: 12, score: 12 } },
  rounds: [
    { playerId: "a", prestige: 2 },
    { playerId: "b", prestige: 10 },
    { playerId: "a", prestige: 18 },
    { playerId: "b", prestige: 2 },
  ],
};

assert.equal(
  buildFieldSpreadDecisiveness(contested, ["a", "b"]),
  buildFieldSpreadDecisiveness(reconcilingGame, ["a", "b"]),
  "expected both games to finish equally strung out",
);
assert.ok(
  buildSettledAt(contested, ["a", "b"]) > 0,
  "expected a game whose lead changed hands to settle later than the start",
);
assert.ok(
  buildGameDecisiveness(contested, ["a", "b"]) <
    buildGameDecisiveness(reconcilingGame, ["a", "b"]),
  "expected the contested game to read as closer despite an identical final spread",
);
assert.ok(
  buildSwingMultiplier(contested, ["a", "b"]) <
    buildSwingMultiplier(reconcilingGame, ["a", "b"]),
  "expected a game decided late to move ratings less than one never in doubt",
);

// Shared leads must not manufacture lead changes: nobody has scored on turn 1,
// so the opening is a tie rather than a lead for whoever plays first.
assert.equal(
  buildSettledAt(
    {
      winnerId: "a",
      totals: {
        a: { totalPrestige: 10, score: 10 },
        b: { totalPrestige: 4, score: 4 },
      },
      rounds: [
        { playerId: "a", prestige: 0 },
        { playerId: "b", prestige: 0 },
        { playerId: "a", prestige: 10 },
        { playerId: "b", prestige: 4 },
      ],
    },
    ["a", "b"],
  ),
  0,
  "expected turns where the top is shared to contribute no lead change",
);

console.log("elo-flow-prestige-closeness-blend.test.cjs passed");
