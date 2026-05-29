const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "elo.tsx"),
  "utf8",
);

assert.match(
  source,
  /describeRecentForm/,
  "expected the live ELO route to use the shared recent-form formatter for the server-authored momentum card value",
);

assert.match(
  source,
  /replaceRecentFormSummaryInText/,
  "expected the live ELO route to rewrite server-authored momentum insight text through the shared recent-form formatter",
);

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
    const fileSource = fs.readFileSync(filename, "utf8");
    const { outputText } = ts.transpileModule(fileSource, {
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
  describeRecentForm,
  replaceRecentFormSummaryInText,
} = require("../utils/eloRecentForm.ts");

assert.equal(describeRecentForm("LLWLL"), "1 win in last 5");
assert.equal(describeRecentForm("WWLW"), "3 wins in last 4");
assert.equal(describeRecentForm(""), "-");
assert.equal(
  replaceRecentFormSummaryInText(
    "Fochizzy recent form: LLWLL. Avg ELO change: -10.4 per game.",
    "LLWLL",
  ),
  "Fochizzy recent form: 1 win in last 5. Avg ELO change: -10.4 per game.",
);

console.log("elo-recent-form-copy.test.cjs passed");
