// Lets .test.cjs files require the app's TypeScript modules directly, with the
// same "@/" alias the bundler resolves. Mirrors the inline preamble older test
// scripts carry; new tests should require this instead of copying it.
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..", "..");

if (!Module._moonrakersTsRequireInstalled) {
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

  Module._moonrakersTsRequireInstalled = true;
}

module.exports = { projectRoot };
