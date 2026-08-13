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
  "20260813200000_moonrakers_elo_peak_prestige_end_score_blend.sql",
);
const migrationSource = fs.readFileSync(migrationPath, "utf8");

assert.match(
  migrationSource,
  /elo_result_weight constant numeric := 0\.6;[\s\S]*elo_performance_weight constant numeric := 0\.4;/,
  "expected the Supabase replay to weight the win/loss result at 0.6 and performance at 0.4",
);

assert.match(
  migrationSource,
  /performance_signal := \(peak_norm \+ prestige_norm \+ end_norm\) \/ 3\.0;/,
  "expected peak score, total prestige, and end score to contribute equally to performance",
);

assert.match(
  migrationSource,
  /base_actual \* elo_result_weight \+ performance_signal \* elo_performance_weight/,
  "expected the bounded actual result to blend the win/loss base with the performance signal",
);

assert.match(
  migrationSource,
  /from public\.game_rounds as gr/,
  "expected peak score to be replayed turn by turn from game_rounds",
);

assert.match(
  migrationSource,
  /max\(running_score\) as peak_score/,
  "expected the replay to keep the highest running score each player reached",
);

assert.match(
  migrationSource,
  /greatest\(\s*coalesce\(pp\.peak_score, coalesce\(gp\.score, 0\)::numeric\),\s*coalesce\(gp\.score, 0\)::numeric\s*\)/,
  "expected peak score to fall back to the end score and never sit below it",
);

assert.match(
  migrationSource,
  /select private\.refresh_all_elo_snapshots\(\);/,
  "expected the migration to recalculate every published rating after redefining the function",
);

// ---------------------------------------------------------------------------
// Client mirror behaviour.
// ---------------------------------------------------------------------------

const {
  BASE_ELO,
  ELO_RESULT_WEIGHT,
  ELO_PERFORMANCE_WEIGHT,
  buildActualScores,
  buildPeakScores,
  buildPerformanceSignals,
  buildRatingHistory,
  calculateElo,
  eloFieldShare,
} = require(path.join(projectRoot, "utils", "elo.ts"));

assert.equal(ELO_RESULT_WEIGHT, 0.6, "expected the result weight to be 0.6");
assert.equal(
  ELO_PERFORMANCE_WEIGHT,
  0.4,
  "expected the performance weight to be 0.4",
);
assert.equal(
  ELO_RESULT_WEIGHT + ELO_PERFORMANCE_WEIGHT,
  1,
  "expected the result and performance weights to cover the whole actual score",
);

// eloFieldShare: matching the table average reads 0.5, doubling it reads 1.
assert.equal(eloFieldShare(10, 10), 0.5, "expected the field average to read 0.5");
assert.equal(eloFieldShare(20, 10), 1, "expected double the field average to read 1");
assert.equal(eloFieldShare(0, 10), 0, "expected a blank game to read 0");
assert.equal(
  eloFieldShare(5, 0),
  0.5,
  "expected a field with no output to fall back to a neutral 0.5",
);
assert.equal(
  eloFieldShare(-40, 10),
  0,
  "expected a negative value to clamp to 0 rather than escape the 0..1 range",
);

function round(value, places = 4) {
  return Number(value.toFixed(places));
}

// --- peak score replay ------------------------------------------------------

// Both players finish on 13. `a` banked everything up front and then gave ground
// to two failures; `b` never held more than they ended with.
const peakedRounds = [
  { playerId: "a", prestige: 16, contracts: 1, failures: 0 },
  { playerId: "b", prestige: 8, contracts: 1, failures: 0 },
  { playerId: "a", prestige: 0, contracts: 0, failures: 1 },
  { playerId: "a", prestige: 0, contracts: 0, failures: 1 },
];

const flatRounds = [
  { playerId: "a", prestige: 0, contracts: 0, failures: 1 },
  { playerId: "b", prestige: 8, contracts: 1, failures: 0 },
  { playerId: "a", prestige: 0, contracts: 0, failures: 1 },
  { playerId: "a", prestige: 16, contracts: 1, failures: 0 },
];

const totals = {
  a: { totalPrestige: 16, score: 13, contracts: 1, failures: 2 },
  b: { totalPrestige: 8, score: 13, contracts: 1, failures: 0 },
};

const peakedGame = { id: "peaked", createdAt: 1, winnerId: "a", totals, rounds: peakedRounds };
const flatGame = { id: "flat", createdAt: 1, winnerId: "a", totals, rounds: flatRounds };

assert.deepEqual(
  buildPeakScores(peakedGame, ["a", "b"]),
  { a: 21, b: 13 },
  "expected the early spike to be recorded as a peak of 21 even though the game ended on 13",
);

assert.deepEqual(
  buildPeakScores(flatGame, ["a", "b"]),
  { a: 13, b: 13 },
  "expected a player who never led their own final tally to peak at their end score",
);

// Assist prestige lands on the recipient in the round it was given.
const assistGame = {
  id: "assist",
  createdAt: 1,
  winnerId: "a",
  totals: {
    a: { totalPrestige: 10, score: 15 },
    b: { totalPrestige: 6, score: 9 },
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
  ],
};

assert.deepEqual(
  buildPeakScores(assistGame, ["a", "b"]),
  { a: 18, b: 9 },
  "expected assist prestige to reach the recipient's running score, and the giver to bank the +3 assist",
);

// No rounds at all (legacy CSV imports) falls back to the end score.
assert.deepEqual(
  buildPeakScores(
    { totals: { a: { totalPrestige: 12, score: 17 }, b: { totalPrestige: 9, score: 9 } } },
    ["a", "b"],
  ),
  { a: 17, b: 9 },
  "expected games saved without round rows to fall back to the end score",
);

// A stored score the rounds cannot explain (head-to-head bonus) still floors the peak.
assert.deepEqual(
  buildPeakScores(
    {
      totals: { a: { totalPrestige: 10, score: 40 }, b: { totalPrestige: 4, score: 4 } },
      rounds: [{ playerId: "a", prestige: 10, contracts: 0, failures: 0 }],
    },
    ["a", "b"],
  ),
  { a: 40, b: 4 },
  "expected the peak to never sit below the authoritative end score",
);

// --- the three signals feed the actual score --------------------------------

const peakedSignals = buildPerformanceSignals(peakedGame, ["a", "b"]);
const flatSignals = buildPerformanceSignals(flatGame, ["a", "b"]);

assert.ok(
  peakedSignals.a > flatSignals.a,
  "expected holding a higher peak to raise the performance signal on identical end totals",
);
assert.ok(
  peakedSignals.b < flatSignals.b,
  "expected the opponent's share to fall when the winner peaked higher",
);

const peakedActual = buildActualScores(peakedGame, ["a", "b"]);
const flatActual = buildActualScores(flatGame, ["a", "b"]);

assert.ok(
  peakedActual.a > flatActual.a,
  "expected peak score to lift the winner's actual score even when prestige and end score match",
);

// Total prestige is read independently of score: same score, more prestige wins out.
const prestigeSignals = buildPerformanceSignals(
  {
    totals: {
      a: { totalPrestige: 20, score: 24 },
      b: { totalPrestige: 8, score: 24 },
    },
  },
  ["a", "b"],
);

assert.ok(
  prestigeSignals.a > prestigeSignals.b,
  "expected higher total prestige to out-score an equal end score",
);

// --- margins matter ---------------------------------------------------------

function makeGame({ id, createdAt = 1, winnerId, aPrestige, aScore, bPrestige, bScore }) {
  return {
    id,
    createdAt,
    winnerId,
    totals: {
      a: { totalPrestige: aPrestige, score: aScore },
      b: { totalPrestige: bPrestige, score: bScore },
    },
  };
}

const narrowWin = calculateElo([
  makeGame({
    id: "narrow",
    winnerId: "a",
    aPrestige: 12,
    aScore: 12,
    bPrestige: 10,
    bScore: 10,
  }),
]);

const routWin = calculateElo([
  makeGame({
    id: "rout",
    winnerId: "a",
    aPrestige: 40,
    aScore: 40,
    bPrestige: 5,
    bScore: 5,
  }),
]);

assert.ok(
  routWin.a > narrowWin.a,
  "expected a rout to gain more rating than a two-point win - margins must survive normalisation",
);
assert.ok(
  routWin.b < narrowWin.b,
  "expected being routed to cost more rating than losing narrowly",
);

// --- wins stay wins ---------------------------------------------------------

const outplayedWinner = calculateElo([
  makeGame({
    id: "outplayed-winner",
    winnerId: "a",
    aPrestige: 11,
    aScore: 11,
    bPrestige: 10,
    bScore: 38,
  }),
]);

assert.ok(
  outplayedWinner.a > BASE_ELO,
  "expected a win to stay rating-positive even when the loser out-performed on score",
);
assert.ok(
  outplayedWinner.b < BASE_ELO,
  "expected a loss to stay rating-negative even when the loser out-performed on score",
);

const strongLoser = calculateElo([
  makeGame({
    id: "strong-loser",
    winnerId: "a",
    aPrestige: 12,
    aScore: 14,
    bPrestige: 10,
    bScore: 30,
  }),
]);
const weakLoser = calculateElo([
  makeGame({
    id: "weak-loser",
    winnerId: "a",
    aPrestige: 12,
    aScore: 14,
    bPrestige: 10,
    bScore: 10,
  }),
]);

assert.ok(
  strongLoser.b > weakLoser.b,
  "expected a losing player with stronger output to lose less rating",
);
assert.ok(
  strongLoser.a < weakLoser.a,
  "expected the winner's gain to soften against a stronger losing side",
);

// --- history stays in step with the final ratings ---------------------------

const seriesGames = [
  makeGame({
    id: "series-1",
    createdAt: 1,
    winnerId: "a",
    aPrestige: 12,
    aScore: 20,
    bPrestige: 10,
    bScore: 11,
  }),
  makeGame({
    id: "series-2",
    createdAt: 2,
    winnerId: "b",
    aPrestige: 9,
    aScore: 11,
    bPrestige: 13,
    bScore: 20,
  }),
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

// ---------------------------------------------------------------------------
// Parity anchors.
//
// These are the exact numbers private.refresh_all_elo_snapshots() must also
// produce for the equivalent rows, so the server replay and this client mirror
// can be diffed directly. Game 1 is the peak-versus-end case above; game 2
// routes 6 assist prestige from `a` to `b` on turn 0, so `b` peaks at 6 while
// `a` banks 10 prestige + 5 contract + 3 assist = 18.
// ---------------------------------------------------------------------------

const parityGameOne = {
  id: "parity-1",
  createdAt: 1,
  winnerId: "a",
  totals,
  rounds: peakedRounds,
};

const parityGameTwo = {
  id: "parity-2",
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
  buildPeakScores(parityGameTwo, ["a", "b", "c"]),
  { a: 18, b: 6, c: 25 },
  "expected assist prestige to raise the recipient's peak in the turn it was given",
);

assert.equal(
  round(buildActualScores(parityGameOne, ["a", "b"]).a, 6),
  0.837908,
  "expected the winner's blended actual score to stay pinned for cross-checking the SQL replay",
);

assert.deepEqual(
  calculateElo([parityGameOne]),
  { a: 1011, b: 989 },
  "expected the one-game replay to land on 1011/989",
);

assert.deepEqual(
  calculateElo([parityGameOne, parityGameTwo]),
  { a: 1001, b: 976, c: 1013 },
  "expected the two-game replay to land on 1001/976/1013",
);

console.log("elo-peak-prestige-end-score-blend.test.cjs passed");
