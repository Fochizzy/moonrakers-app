const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;
const titleCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

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
  DEFINITION_GROUPS,
  getDefinitionItem,
  getRelatedDefinitionKeys,
} = require(path.join(projectRoot, "utils", "definitionCatalog.ts"));

function sortTitles(titles) {
  return [...titles].sort((left, right) => titleCollator.compare(left, right));
}

for (const group of DEFINITION_GROUPS) {
  const itemTitles = group.items.map((item) => item.title);

  assert.deepEqual(
    itemTitles,
    sortTitles(itemTitles),
    `expected ${group.title} terms to be alphabetical`,
  );

  for (const item of group.items) {
    const relatedTitles = getRelatedDefinitionKeys(item.key)
      .map((key) => getDefinitionItem(key)?.title ?? null)
      .filter(Boolean);

    if (relatedTitles.length < 2) {
      continue;
    }

    assert.deepEqual(
      relatedTitles,
      sortTitles(relatedTitles),
      `expected ${item.title} related terms to be alphabetical`,
    );
  }
}

console.log("definitions-alphabetical-order.test.cjs passed");
