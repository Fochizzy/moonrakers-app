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
  filterGroupsForSignedInPlayer,
} = require(path.join(__dirname, "..", "utils", "homeCommandSelection.ts"));

const rankedGroups = [
  { id: "g1", name: "Usual Suspects", playerIds: ["izzy", "corey", "greg"] },
  { id: "g2", name: "Showdown", playerIds: ["greg", "james"] },
  { id: "g3", name: "Wake Up!", playerIds: ["corey", "izzy", "james"] },
];

assert.deepEqual(
  filterGroupsForSignedInPlayer(rankedGroups, "izzy").map((group) => group.id),
  ["g1", "g3"],
  "expected the home command groups list to keep only groups containing the signed-in player",
);

console.log("home-command-visible-groups.test.cjs passed");
