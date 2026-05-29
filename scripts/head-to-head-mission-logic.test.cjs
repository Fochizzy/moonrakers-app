const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
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
  buildSubmitRoundCandidate,
} = require("../lib/game-session/gameSessionController.ts");
const { buildTotals } = require("../engine/gameEngine.ts");

const current = {
  prestige: 3,
  contracts: 1,
  failures: 0,
  assistRecipients: {},
  assistPrestigeRecipients: {},
  objectiveCount: 0,
  headToHeadFirstPlaceId: "p2",
  headToHeadSecondPlaceId: "p3",
};

const candidate = buildSubmitRoundCandidate({
  activeTurnPlayerId: "p1",
  current,
  existingRounds: [],
  objectiveAwardsByPlayer: {},
  now: (() => {
    let tick = 1_000;
    return () => tick++;
  })(),
});

assert.equal(candidate.nextRounds.length, 3, "expected a main round plus two linked head-to-head rounds");

const firstPlaceRound = candidate.nextRounds.find(
  (round) => round.metaType === "headToHeadFirstPlace",
);
const secondPlaceRound = candidate.nextRounds.find(
  (round) => round.metaType === "headToHeadSecondPlace",
);

assert.deepEqual(
  {
    playerId: firstPlaceRound?.playerId,
    prestige: firstPlaceRound?.prestige,
    linkedTurnId: firstPlaceRound?.linkedTurnId,
  },
  {
    playerId: "p2",
    prestige: 1,
    linkedTurnId: candidate.mainRound.id,
  },
  "expected first place to be recorded as a linked prestige bonus round",
);

assert.deepEqual(
  {
    playerId: secondPlaceRound?.playerId,
    headToHeadScoreBonus: secondPlaceRound?.headToHeadScoreBonus,
    linkedTurnId: secondPlaceRound?.linkedTurnId,
  },
  {
    playerId: "p3",
    headToHeadScoreBonus: 2,
    linkedTurnId: candidate.mainRound.id,
  },
  "expected second place to be recorded as a linked score bonus round",
);

const totals = buildTotals(candidate.nextRounds, [
  { id: "p1", name: "Alpha" },
  { id: "p2", name: "Bravo" },
  { id: "p3", name: "Charlie" },
]);

assert.equal(totals.p2.totalPrestige, 1, "expected first place to gain 1 prestige");
assert.equal(
  totals.p2.headToHeadScoreBonus,
  3,
  "expected an off-turn first-place finish to add 3 score",
);
assert.equal(
  totals.p3.headToHeadScoreBonus,
  2,
  "expected second place to carry a 2-point score bonus into totals",
);
assert.equal(totals.p2.score, 4, "expected first place to keep 1 prestige plus 3 score");
assert.equal(totals.p3.score, 2, "expected second place to contribute 2 score without prestige");

const onTurnWinnerCandidate = buildSubmitRoundCandidate({
  activeTurnPlayerId: "p2",
  current: {
    ...current,
    headToHeadFirstPlaceId: "p2",
    headToHeadSecondPlaceId: "p1",
  },
  existingRounds: [],
  objectiveAwardsByPlayer: {},
  now: (() => {
    let tick = 2_000;
    return () => tick++;
  })(),
});
const onTurnTotals = buildTotals(onTurnWinnerCandidate.nextRounds, [
  { id: "p1", name: "Alpha" },
  { id: "p2", name: "Bravo" },
  { id: "p3", name: "Charlie" },
]);

assert.equal(
  onTurnTotals.p2.headToHeadScoreBonus,
  5,
  "expected the active turn player to receive the full 5-point first-place score bonus",
);

console.log("head-to-head-mission-logic.test.cjs passed");
