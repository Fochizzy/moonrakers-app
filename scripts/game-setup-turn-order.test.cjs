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
  options
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
  buildActiveGamePlayersFromTurnOrder,
  buildTurnOrderSummary,
  canSubmitGameSetup,
  promoteTurnOrderPlayer,
} = require("../utils/gameSetupTurnOrder.ts");

const reorderedPlayers = [
  {
    id: "greg",
    name: "Greg",
    color: "#2563EB",
    assignedCardArtIndex: 4,
  },
  {
    id: "james",
    name: "James",
    color: "#16A34A",
    assignedCardArtIndex: 7,
  },
  {
    id: "ada",
    name: "Ada",
    color: "#7C3AED",
  },
];

const payload = buildActiveGamePlayersFromTurnOrder(reorderedPlayers);

assert.equal(canSubmitGameSetup(reorderedPlayers), true);
assert.equal(canSubmitGameSetup(reorderedPlayers.slice(0, 1)), false);
assert.equal(
  canSubmitGameSetup([...reorderedPlayers, ...reorderedPlayers]),
  false
);

assert.deepEqual(
  payload.map((player) => ({ id: player.id, startOrder: player.startOrder })),
  [
    { id: "greg", startOrder: 0 },
    { id: "james", startOrder: 1 },
    { id: "ada", startOrder: 2 },
  ]
);

assert.deepEqual(payload.map((player) => player.assignedCardArtIndex), [4, 7, null]);

assert.equal(payload[2]?.initials, "AD");

assert.equal(buildTurnOrderSummary(reorderedPlayers), "1. Greg  /  2. James  /  3. Ada");

const promoted = promoteTurnOrderPlayer(reorderedPlayers, "ada");

assert.deepEqual(
  promoted.map((player) => player.id),
  ["ada", "greg", "james"]
);

assert.equal(buildTurnOrderSummary(promoted), "1. Ada  /  2. Greg  /  3. James");

assert.deepEqual(promoteTurnOrderPlayer(reorderedPlayers, "missing"), reorderedPlayers);

console.log("game-setup-turn-order.test.cjs passed");
