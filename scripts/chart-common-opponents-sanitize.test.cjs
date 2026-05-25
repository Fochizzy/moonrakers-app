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
  buildCommonOpponentOptions,
} = require("../utils/charts.ts");

const riskyPlayer = {
  id: "greg",
  name: "Greg",
  color: "#3B82F6",
  initials: "G",
  assignedCardArtIndex: 2,
};

Object.defineProperty(riskyPlayer, "normalized", {
  enumerable: true,
  get() {
    throw new Error("normalized getter should not be touched");
  },
});

const players = [
  { id: "izzy", name: "Izzy", color: "#A855F7", initials: "I" },
  riskyPlayer,
  { id: "james", name: "James", color: "#22C55E", initials: "J" },
];

const games = [
  {
    id: "game-1",
    players: [
      { id: "izzy", name: "Izzy" },
      { id: "greg", name: "Greg" },
      { id: "james", name: "James" },
    ],
    totals: {
      izzy: { totalPrestige: 5 },
      greg: { totalPrestige: 7 },
      james: { totalPrestige: 6 },
    },
  },
  {
    id: "game-2",
    players: [
      { id: "izzy", name: "Izzy" },
      { id: "greg", name: "Greg" },
    ],
    totals: {
      izzy: { totalPrestige: 4 },
      greg: { totalPrestige: 8 },
    },
  },
];

const options = buildCommonOpponentOptions({
  playerId: "izzy",
  players,
  games,
  limit: 5,
});

assert.equal(options.length, 2, "expected common opponent options to be returned");
assert.equal(options[0].id, "greg", "expected Greg to be the most frequent opponent");
assert.equal(options[0].gamesPlayed, 2, "expected Greg to count both shared games");
assert.equal(options[0].name, "Greg", "expected the plain player shape to keep visible player fields");
assert.ok(
  !Object.prototype.hasOwnProperty.call(options[0], "normalized"),
  "expected sanitized opponent cards to avoid copying hidden player properties"
);

console.log("chart-common-opponents-sanitize.test.cjs passed");
