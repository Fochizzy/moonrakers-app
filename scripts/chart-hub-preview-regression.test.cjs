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

const { resolveChartCatalogEntry } = require("../components/charts/chartCatalog.ts");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

assert.equal(
  resolveChartCatalogEntry("efficiency_failure_scatter").preview,
  "scatter",
  "expected the efficiency chart to keep its dedicated scatter preview glyph on the charts hub"
);

const previewSource = read(path.join("components", "charts", "ChartHubPreview.tsx"));
const previewGlyphSource = read(path.join("components", "charts", "ChartPreviewGlyph.tsx"));

assert.match(
  previewSource,
  /function PreviewScatter\(/,
  "expected ChartHubPreview to define the restored scatter preview renderer"
);

assert.match(
  previewSource,
  /function PreviewElo\(/,
  "expected ChartHubPreview to define a dedicated ELO graph preview renderer"
);

assert.match(
  previewSource,
  /scatter:\s*\(\{\s*stroke,\s*width,\s*height\s*\}\)\s*=>\s*\(\s*<PreviewScatter/s,
  "expected the preview renderer map to wire the scatter glyph back in"
);

assert.match(
  previewSource,
  /elo:\s*\(\{\s*stroke,\s*fill,\s*width,\s*height\s*\}\)\s*=>\s*\(\s*<PreviewElo/s,
  "expected the preview renderer map to wire the ELO card to the inline graph preview"
);

assert.doesNotMatch(
  previewSource,
  /APP_ICONS\.yellowHub|assetPreviewImage|source=\{APP_ICONS\./,
  "expected the ELO charts hub card to stop rendering an asset thumbnail"
);

assert.match(
  previewGlyphSource,
  /function PreviewElo\(/,
  "expected ChartPreviewGlyph to mirror the dedicated ELO graph preview renderer"
);

assert.match(
  previewGlyphSource,
  /elo:\s*\(\{\s*stroke,\s*fill,\s*width,\s*height\s*\}\)\s*=>\s*\(\s*<PreviewElo/s,
  "expected ChartPreviewGlyph to mirror the inline ELO graph preview mapping"
);

assert.doesNotMatch(
  previewGlyphSource,
  /APP_ICONS\.yellowHub|assetPreviewImage|source=\{APP_ICONS\./,
  "expected ChartPreviewGlyph to stop rendering an ELO asset thumbnail too"
);

assert.match(
  previewSource,
  /const CHART_PREVIEW_RENDERERS:/,
  "expected ChartHubPreview to use the restored preview renderer map instead of the older hard-coded branch list"
);

console.log("chart-hub-preview-regression.test.cjs passed");
