const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const sourcePath = path.resolve(__dirname, "..", "app", "game.tsx");
const source = fs.readFileSync(sourcePath, "utf8");

function expectIncludes(pattern, label) {
  if (!source.includes(pattern)) {
    throw new Error(`Missing ${label}: ${pattern}`);
  }
}

expectIncludes("bottomInset={insets.bottom}", "bottom inset passed into ActionsSection");
expectIncludes("bottomInset: number;", "bottom inset prop typing");
expectIncludes("Math.max(bottomInset, 16) + 16", "extra Android nav clearance");

const result = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
    allowJs: true,
  },
  fileName: sourcePath,
  reportDiagnostics: true,
});

const diagnostics = (result.diagnostics ?? []).map((diagnostic) => ({
  code: diagnostic.code,
  message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
}));

assert.deepEqual(
  diagnostics,
  [],
  `Expected app/game.tsx JSX to parse cleanly.\n${diagnostics
    .map(({ code, message }) => `TS${code}: ${message}`)
    .join("\n")}`
);

console.log("PASS game action safe-area regression");
