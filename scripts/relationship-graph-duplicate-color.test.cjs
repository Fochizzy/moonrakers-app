const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;
const originalLoad = Module._load;

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

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "react-native") {
    return {
      StyleSheet: { create: (styles) => styles },
      TouchableOpacity: "TouchableOpacity",
      View: "View",
    };
  }

  if (
    request === "@/components/ui/Text" ||
    request.endsWith(path.join("components", "ui", "Text.tsx"))
  ) {
    return { __esModule: true, default: "Text" };
  }

  if (
    request === "@/components/charts/ChartFocusCard" ||
    request.endsWith(path.join("components", "charts", "ChartFocusCard.tsx"))
  ) {
    return { __esModule: true, default: "ChartFocusCard" };
  }

  if (
    request === "@/components/charts/ChartStage" ||
    request.endsWith(path.join("components", "charts", "ChartStage.tsx"))
  ) {
    return { __esModule: true, default: "ChartStage" };
  }

  if (
    request === "@/components/charts/ChartUnderlineTabs" ||
    request.endsWith(path.join("components", "charts", "ChartUnderlineTabs.tsx"))
  ) {
    return { __esModule: true, default: "ChartUnderlineTabs" };
  }

  if (request === "react-native-svg") {
    return {
      __esModule: true,
      default: "Svg",
      Circle: "Circle",
      Defs: "Defs",
      G: "G",
      LinearGradient: "LinearGradient",
      Path: "Path",
      Rect: "Rect",
      Stop: "Stop",
      Text: "SvgText",
    };
  }

  return originalLoad.call(this, request, parent, isMain);
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

const source = fs.readFileSync(
  path.join(projectRoot, "components", "charts", "RelationshipGraph.tsx"),
  "utf8",
);

assert.match(
  source,
  /resolveDistinctGraphPlayers\(visiblePlayers\)/,
  "expected RelationshipGraph to resolve duplicate player colors before building graph nodes and edges",
);

const {
  resolveDistinctGraphPlayers,
} = require(path.join(projectRoot, "components", "charts", "RelationshipGraph.tsx"));

const resolved = resolveDistinctGraphPlayers([
  { id: "greg", name: "GregMTG", color: "sky" },
  { id: "corey", name: "Corey", color: "sky" },
  { id: "fochiz", name: "Fochiz", color: "#A855F7" },
]);

assert.equal(resolved.length, 3);
assert.equal(resolved[0].color?.toLowerCase(), "#0ea5e9");
assert.notEqual(
  resolved[1].color?.toLowerCase(),
  resolved[0].color?.toLowerCase(),
  "expected duplicate player colors to auto-shift to a distinct graph color",
);
assert.equal(
  resolved[2].color?.toLowerCase(),
  "#a855f7",
  "expected unique player colors to stay unchanged",
);

console.log("relationship-graph-duplicate-color.test.cjs passed");
