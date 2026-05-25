const assert = require("node:assert/strict");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const configPath = ts.findConfigFile(projectRoot, ts.sys.fileExists, "tsconfig.json");

assert.ok(configPath, "Expected tsconfig.json to exist");

const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  path.dirname(configPath)
);

const program = ts.createProgram({
  rootNames: parsed.fileNames,
  options: parsed.options,
});

const targetFile = path.resolve(projectRoot, "app", "index.tsx");
const diagnostics = ts
  .getPreEmitDiagnostics(program)
  .filter((diagnostic) => diagnostic.file && path.resolve(diagnostic.file.fileName) === targetFile)
  .map((diagnostic) => ({
    code: diagnostic.code,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
  }));

assert.deepEqual(
  diagnostics,
  [],
  `Expected app/index.tsx to be free of local TypeScript diagnostics.\n${diagnostics
    .map(({ code, message }) => `TS${code}: ${message}`)
    .join("\n")}`
);

console.log("PASS home screen local diagnostics are clean");
