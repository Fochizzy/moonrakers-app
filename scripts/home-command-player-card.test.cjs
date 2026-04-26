const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

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
  mergeRegisteredProfileIntoPlayer,
} = require(path.join(__dirname, "..", "utils", "registeredProfilePlayer.ts"));

const preserved = mergeRegisteredProfileIntoPlayer(
  {
    id: "p1",
    name: "Alpha Local",
    color: "blue",
    initials: "AL",
    assignedCardArtIndex: 7,
  },
  {
    id: "p1",
    name: "Alpha",
    displayName: "Alpha Prime",
    color: "blue",
    assignedCardArtIndex: null,
    hasSavedGames: false,
  },
);

assert.equal(
  preserved.assignedCardArtIndex,
  7,
  "Missing registered-profile card art should not erase a player's selected local card art",
);

const promoted = mergeRegisteredProfileIntoPlayer(
  {
    id: "p2",
    name: "Beta Local",
    color: "green",
    assignedCardArtIndex: 4,
  },
  {
    id: "p2",
    name: "Beta",
    displayName: "Beta Prime",
    color: "purple",
    assignedCardArtIndex: 12,
    hasSavedGames: true,
  },
);

assert.equal(
  promoted.assignedCardArtIndex,
  12,
  "Registered-profile card art should override stale local art when a real selection exists",
);

assert.equal(
  promoted.color,
  "purple",
  "Registered-profile color should stay authoritative when present",
);

console.log("home-command-player-card.test.cjs passed");
