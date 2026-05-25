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
  applyTurnOrderPlayerColorOverride,
  buildActiveGamePlayersFromTurnOrder,
} = require("../utils/gameSetupTurnOrder.ts");

const gameSetupSource = fs.readFileSync(
  path.join(projectRoot, "app", "game-setup.tsx"),
  "utf8",
);

const originalPlayers = [
  {
    id: "corey",
    name: "Corey",
    color: "blue",
    assignedCardArtIndex: 10,
  },
  {
    id: "greg",
    name: "Greg",
    color: "green",
    assignedCardArtIndex: 11,
  },
];

const updatedPlayers = applyTurnOrderPlayerColorOverride(
  originalPlayers,
  "corey",
  "yellow",
);

assert.notEqual(
  updatedPlayers,
  originalPlayers,
  "expected color override helper to return a new player array",
);

assert.equal(updatedPlayers[0]?.color, "yellow");
assert.equal(
  updatedPlayers[0]?.assignedCardArtIndex,
  14,
  "expected color override to keep the same art row while swapping color columns",
);

assert.equal(
  originalPlayers[0]?.color,
  "blue",
  "expected color override helper to avoid mutating the original player data",
);

assert.deepEqual(
  updatedPlayers[1],
  originalPlayers[1],
  "expected color override helper to leave unrelated players unchanged",
);

const fallbackOverride = applyTurnOrderPlayerColorOverride(
  [{ id: "izzy", name: "Izzy", color: "purple", assignedCardArtIndex: null }],
  "izzy",
  "orange",
);

assert.equal(
  fallbackOverride[0]?.assignedCardArtIndex,
  3,
  "expected color override to fall back to the default row-zero art for the new color",
);

const activePlayers = buildActiveGamePlayersFromTurnOrder(updatedPlayers);

assert.equal(activePlayers[0]?.color, "yellow");
assert.equal(activePlayers[0]?.assignedCardArtIndex, 14);

assert.match(
  gameSetupSource,
  /const \[selectedPlayerId, setSelectedPlayerId\] = useState<string \| null>\(null\);/,
  "expected game setup to track a selected player for color changes",
);

assert.match(
  gameSetupSource,
  /onPress=\{isStartingGame \? undefined : \(\) => onSelectPlayer\(item\.id\)\}/,
  "expected tapping a setup tile to select that player",
);

assert.match(
  gameSetupSource,
  /onLongPress=\{isStartingGame \? undefined : drag\}/,
  "expected long-press drag reorder to remain on the setup tile",
);

assert.match(
  gameSetupSource,
  /title="Change Color"/,
  "expected a top-right Change Color button on the setup screen",
);

assert.match(
  gameSetupSource,
  /Game-only color/,
  "expected the setup screen to render game-only color chooser copy",
);

assert.match(
  gameSetupSource,
  /<View style=\{styles\.rowBody\}>[\s\S]*<View style=\{\[styles\.rowAvatarWrap[\s\S]*<View style=\{styles\.rowCopy\}>[\s\S]*styles\.rowName[\s\S]*styles\.rowMeta/s,
  "expected setup tiles to place the player name copy to the right of the card art",
);

console.log("game-setup-color-selector.test.cjs passed");
