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
  buildEfficiencyFailureScatterLayout,
  resolveEfficiencyFailureScatterLabelPlacement,
} = require("../components/charts/efficiencyFailureScatterLayout.ts");

const layout = buildEfficiencyFailureScatterLayout(296);

assert.equal(
  layout.width,
  296,
  "expected the efficiency scatter to respect the measured card width instead of overflowing with a fixed SVG width",
);

assert.ok(
  layout.innerWidth > 0 && layout.innerHeight > 0,
  "expected the responsive scatter layout to preserve a usable plot area on phone-width cards",
);

const rightEdgeLabel = resolveEfficiencyFailureScatterLabelPlacement({
  pointX: layout.width - layout.padRight + 2,
  pointY: 120,
  chartWidth: layout.width,
  padLeft: layout.padLeft,
  padRight: layout.padRight,
});

assert.deepEqual(
  rightEdgeLabel,
  {
    x: layout.width - layout.padRight - 4,
    y: 110,
    textAnchor: "end",
  },
  "expected right-edge player labels to anchor inward so the label stays inside the chart card",
);

console.log("efficiency-failure-scatter-fit.test.cjs passed");
