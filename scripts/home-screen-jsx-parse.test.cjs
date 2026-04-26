const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const sourcePath = path.resolve(__dirname, "..", "app", "index.tsx");
const source = fs.readFileSync(sourcePath, "utf8");

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
  `Expected app/index.tsx JSX to parse cleanly.\n${diagnostics
    .map(({ code, message }) => `TS${code}: ${message}`)
    .join("\n")}`
);

console.log("PASS home screen JSX parses cleanly");
