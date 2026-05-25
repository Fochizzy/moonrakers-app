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
  ensureRequiredPlayerSelection,
} = require(path.join(__dirname, "..", "utils", "homeCommandSelection.ts"));

assert.deepEqual(
  ensureRequiredPlayerSelection([], "izzy"),
  ["izzy"],
  "expected the signed-in player to auto-select when the game picker opens empty",
);

assert.deepEqual(
  ensureRequiredPlayerSelection(["greg", "james", "ada", "nova", "bolt"], "izzy"),
  ["izzy", "greg", "james", "ada", "nova"],
  "expected the signed-in player to stay in a full five-seat selection",
);

assert.deepEqual(
  ensureRequiredPlayerSelection(["greg", "izzy", "james"], "izzy"),
  ["greg", "izzy", "james"],
  "expected an existing signed-in player selection to remain stable",
);

console.log("home-command-required-player.test.cjs passed");
