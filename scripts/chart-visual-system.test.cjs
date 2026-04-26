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

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

const source = fs.readFileSync(
  path.join(projectRoot, "components", "charts", "chartVisualSystem.ts"),
  "utf8"
);
const visualSystem = require(path.join(
  projectRoot,
  "components",
  "charts",
  "chartVisualSystem.ts"
));

run("Shared chart visual system exposes stage presets for plot, beam, glow, inactive, and focus surfaces", () => {
  const standard = visualSystem.getChartStagePreset("standard");
  const comparison = visualSystem.getChartStagePreset("comparison");
  const compact = visualSystem.getChartStagePreset("compact");

  for (const preset of [standard, comparison, compact]) {
    assert.equal(typeof preset.plotFill, "string");
    assert.equal(typeof preset.beamFill, "string");
    assert.equal(typeof preset.glowColor, "string");
    assert.equal(typeof preset.focusCardFill, "string");
    assert.equal(typeof preset.inactiveOpacity, "number");
  }
});

run("Compact focus cards stay dark enough for readable chart inspectors", () => {
  const compact = visualSystem.getChartStagePreset("compact");

  assert.notEqual(
    compact.focusCardFill,
    "#ffffff",
    "expected compact focus cards to avoid a white inspector background"
  );

  assert.match(
    source,
    /focusCardFill:\s*withAlpha\(CHART_COLORS\.cardAlt,\s*0\.96\)/,
    "expected the compact preset to stay anchored to the dark chart card surface"
  );
});

run("Shared chart primitives export stage, focus card, and underline tabs", () => {
  for (const file of [
    "ChartStage.tsx",
    "ChartFocusCard.tsx",
    "ChartUnderlineTabs.tsx",
  ]) {
    assert.ok(
      fs.existsSync(path.join(projectRoot, "components", "charts", file)),
      `expected ${file} to exist`
    );
  }
});

run("Legacy chart visual helpers stay available during the staged rollout", () => {
  assert.equal(typeof visualSystem.getQuietChipStyle, "function");
  assert.equal(typeof visualSystem.getChartToneStyles, "function");
  assert.equal(typeof visualSystem.withChartAlpha, "function");
});
