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

const { getAnalyticsHubCards } = require("../utils/appHubs.ts");

const cards = getAnalyticsHubCards();

assert.equal(
  cards.find((card) => card.key === "compare")?.iconKey,
  "compare",
  "expected Compare to use the semantic compare icon mapping on the analytics hub"
);

assert.equal(
  cards.find((card) => card.key === "charts")?.iconKey,
  "charts",
  "expected Charts to use the semantic charts icon mapping on the analytics hub"
);

assert.equal(
  cards.find((card) => card.key === "stats")?.iconKey,
  "statistics",
  "expected Stats to use the semantic statistics icon mapping on the analytics hub"
);

assert.equal(
  cards.find((card) => card.key === "elo")?.iconKey,
  "elo",
  "expected ELO to use the semantic elo icon mapping on the analytics hub"
);

console.log("analytics-hub-icon-remap.test.cjs passed");
