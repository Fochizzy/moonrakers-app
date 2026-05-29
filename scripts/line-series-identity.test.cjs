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

const {
  buildLineSeriesIdentities,
} = require("../components/charts/lineSeriesIdentity.ts");

const identities = buildLineSeriesIdentities([
  { id: "izzy", name: "Izzy", color: "#A855F7" },
  { id: "greg", name: "Greg", color: "#A855F7" },
  { id: "jake", name: "Jake", color: "#22C55E" },
  { id: "sol", name: "Sol", color: "#A855F7" },
]);

assert.deepEqual(
  identities.map((entry) => ({
    id: entry.id,
    hasColorCollision: entry.hasColorCollision,
    collisionIndex: entry.collisionIndex,
    strokeDasharray: entry.strokeDasharray ?? null,
    collisionBadgeText: entry.collisionBadgeText ?? null,
  })),
  [
    {
      id: "izzy",
      hasColorCollision: true,
      collisionIndex: 0,
      strokeDasharray: null,
      collisionBadgeText: "IZ",
    },
    {
      id: "greg",
      hasColorCollision: true,
      collisionIndex: 1,
      strokeDasharray: "10 7",
      collisionBadgeText: "GR",
    },
    {
      id: "jake",
      hasColorCollision: false,
      collisionIndex: 0,
      strokeDasharray: null,
      collisionBadgeText: null,
    },
    {
      id: "sol",
      hasColorCollision: true,
      collisionIndex: 2,
      strokeDasharray: "3 6",
      collisionBadgeText: "SO",
    },
  ],
  "expected duplicate-color series to get stable stroke identities plus a matching short-code badge while unique colors stay unbadged",
);

console.log("line-series-identity.test.cjs passed");
