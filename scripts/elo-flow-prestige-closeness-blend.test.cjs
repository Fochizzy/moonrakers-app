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
  "20260813210000_moonrakers_elo_flow_and_closeness.sql",
);
const migrationSource = fs.readFileSync(migrationPath, "utf8");

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
  /\(\(top_prestige - runner_up_prestige\) \/ prestige_mean\) \/ elo_decisive_margin_ratio/,
  "expected decisiveness to come from the winner's prestige margin over the runner-up",
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
  buildFlowScores,
  buildGameDecisiveness,
  buildPerformanceSignals,
  buildRatingHistory,
  buildRunningScores,
  buildSwingMultiplier,
  calculateElo,
  eloFieldStanding,
} = require(path.join(projectRoot, "utils", "elo.ts"));

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
  { a: 1010, b: 990 },
  "expected the wire-to-wire replay to land on 1010/990",
);

assert.deepEqual(
  calculateElo([wireToWire, assistGame]),
  { a: 998, b: 973, c: 1017 },
  "expected the two-game replay to land on 998/973/1017",
);

console.log("elo-flow-prestige-closeness-blend.test.cjs passed");
