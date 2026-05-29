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

const {
  BASE_ELO,
  buildRatingHistory,
  calculateElo,
} = require(path.join(projectRoot, "utils", "elo.ts"));

function makeTotals(totalPrestige, bonusScore) {
  return {
    totalPrestige,
    score: totalPrestige + bonusScore,
  };
}

function makeGame({
  id,
  createdAt,
  winnerId,
  aPrestige = 12,
  aBonus = 0,
  bPrestige = 10,
  bBonus = 0,
}) {
  return {
    id,
    createdAt,
    winnerId,
    players: [{ id: "a" }, { id: "b" }],
    totals: {
      a: makeTotals(aPrestige, aBonus),
      b: makeTotals(bPrestige, bBonus),
    },
  };
}

const lowBonusWinnerRatings = calculateElo([
  makeGame({
    id: "winner-low-bonus",
    createdAt: 1,
    winnerId: "a",
    aBonus: 0,
    bBonus: 0,
  }),
]);

const highBonusWinnerRatings = calculateElo([
  makeGame({
    id: "winner-high-bonus",
    createdAt: 1,
    winnerId: "a",
    aBonus: 8,
    bBonus: 0,
  }),
]);

assert.ok(
  highBonusWinnerRatings.a > lowBonusWinnerRatings.a,
  "expected a winner with stronger bonus-score output to gain more ELO",
);

assert.ok(
  highBonusWinnerRatings.b < lowBonusWinnerRatings.b,
  "expected the opponent to lose more ELO when the winner also posts stronger bonus score",
);

const lowBonusLoserRatings = calculateElo([
  makeGame({
    id: "loser-low-bonus",
    createdAt: 1,
    winnerId: "a",
    aBonus: 2,
    bBonus: 0,
  }),
]);

const highBonusLoserRatings = calculateElo([
  makeGame({
    id: "loser-high-bonus",
    createdAt: 1,
    winnerId: "a",
    aBonus: 2,
    bBonus: 9,
  }),
]);

assert.ok(
  highBonusLoserRatings.b > lowBonusLoserRatings.b,
  "expected a losing player with stronger bonus-score output to lose less ELO",
);

assert.ok(
  highBonusLoserRatings.a < lowBonusLoserRatings.a,
  "expected the winner's gain to soften when the losing side posts stronger bonus score",
);

assert.ok(
  highBonusLoserRatings.a > BASE_ELO,
  "expected a win to stay rating-positive even when bonus score is weak",
);

assert.ok(
  highBonusLoserRatings.b < BASE_ELO,
  "expected a loss to stay rating-negative even when bonus score is strong",
);

const seriesGames = [
  makeGame({
    id: "series-1",
    createdAt: 1,
    winnerId: "a",
    aBonus: 8,
    bBonus: 1,
  }),
  makeGame({
    id: "series-2",
    createdAt: 2,
    winnerId: "b",
    aPrestige: 9,
    aBonus: 2,
    bPrestige: 13,
    bBonus: 7,
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

console.log("elo-bonus-score-blend.test.cjs passed");
