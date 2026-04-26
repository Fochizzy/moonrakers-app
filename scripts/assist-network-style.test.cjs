const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;
const originalLoad = Module._load;
const originalUseMemo = React.useMemo;
const originalUseState = React.useState;
const originalUseEffect = React.useEffect;

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

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "react-native") {
    return {
      Pressable: "Pressable",
      ScrollView: "ScrollView",
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

  if (request === "react-native-svg") {
    return {
      __esModule: true,
      default: "Svg",
      Circle: "Circle",
      G: "G",
      Path: "Path",
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

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  } finally {
    React.useMemo = originalUseMemo;
    React.useState = originalUseState;
    React.useEffect = originalUseEffect;
  }
}

function flatten(node, acc = []) {
  if (node == null || typeof node === "boolean") return acc;
  if (Array.isArray(node)) {
    node.forEach((child) => flatten(child, acc));
    return acc;
  }
  if (typeof node === "object" && "type" in node) {
    acc.push(node);
    flatten(node.props?.children, acc);
  }
  return acc;
}

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

run("Relationship graph source renders per-game assist labels on visible edges", () => {
  const relationshipGraphSource = read(
    path.join("components", "charts", "RelationshipGraph.tsx")
  );

  assert.match(
    relationshipGraphSource,
    /<SvgText[\s\S]*edge\.(labelText|assistFrequencyPerGame)/,
    "expected the graph renderer to place per-game frequency labels on visible assist edges"
  );
});

run("Assist network overview source includes exact-scope empty-state copy", () => {
  const overviewSource = read(
    path.join(
      "components",
      "charts",
      "AssistNetworkOverview",
      "AssistNetworkOverview.tsx"
    )
  );

  assert.match(
    overviewSource,
    /No exact-match games found for this table\./,
    "expected the overview to show an explicit exact-scope empty state"
  );

  assert.match(
    overviewSource,
    /These exact-match games have no recorded assist links yet\./,
    "expected the overview to explain when exact-match games exist but no assist links are recorded"
  );
});

run("Assist network details card source keeps strongest-link helper copy tied to the filtered sample", () => {
  const detailsCardSource = read(
    path.join(
      "components",
      "charts",
      "AssistNetworkOverview",
      "AssistNetworkDetailsCard.tsx"
    )
  );

  assert.match(
    detailsCardSource,
    /topLinkValue\} across the exact filtered table/,
    "expected the details card to keep strongest-link helper copy explicit about the exact filtered table"
  );
});

run("Assist network overview expects unified games instead of legacy data and relationship props", () => {
  const source = read(
    path.join(
      "components",
      "charts",
      "AssistNetworkOverview",
      "AssistNetworkOverview.tsx"
    )
  );

  assert.match(
    source,
    /type Props = \{[\s\S]*games\?:/,
    "expected AssistNetworkOverview props to include unified games"
  );

  assert.doesNotMatch(
    source,
    /\bdata\?:\s*SnapshotPoint\[];/,
    "expected AssistNetworkOverview to stop accepting legacy snapshot data"
  );

  assert.doesNotMatch(
    source,
    /\brelationships\?:\s*Relationships;/,
    "expected AssistNetworkOverview to stop accepting prebuilt relationships"
  );

  assert.match(
    source,
    /buildAssistNetworkDataset\(\{\s*games:\s*safeGames,\s*scopedPlayerIds\s*\}\)/,
    "expected AssistNetworkOverview to derive its graph dataset from unified games and scoped ids"
  );
});

run("Assist network overview composes controls, details, and the graph surface together", () => {
  React.useMemo = (fn) => fn();
  React.useState = (initial) => [
    typeof initial === "function" ? initial() : initial,
    () => {},
  ];
  React.useEffect = () => {};

  const overviewModule = require(path.join(
    projectRoot,
    "components",
    "charts",
    "AssistNetworkOverview",
    "AssistNetworkOverview.tsx"
  ));
  const AssistNetworkOverview = overviewModule.default;

  const tree = AssistNetworkOverview({
    players: [
      { id: "greg", name: "Greg", color: "sky" },
      { id: "izzy", name: "Izzy", color: "purple" },
      { id: "james", name: "James", color: "green" },
    ],
    games: [
      {
        id: "game-1",
        players: [
          { id: "greg", name: "Greg" },
          { id: "izzy", name: "Izzy" },
          { id: "james", name: "James" },
        ],
        rounds: [
          {
            playerId: "greg",
            assistRecipients: { izzy: 1, james: 1 },
            assistPrestigeRecipients: { izzy: 2, james: 1 },
          },
          {
            playerId: "izzy",
            assistRecipients: { greg: 1 },
            assistPrestigeRecipients: { greg: 3 },
          },
        ],
      },
    ],
    scopedPlayerIds: ["greg", "izzy", "james"],
  });

  const nodes = flatten(tree);
  const relationshipGraphEntry = nodes.find(
    (entry) =>
      typeof entry.type === "function" && entry.type.name === "RelationshipGraph"
  );

  assert.equal(
    nodes.some(
      (entry) =>
        typeof entry.type === "function" && entry.type.name === "AssistNetworkControls"
    ),
    false,
    "expected AssistNetworkOverview to stop rendering AssistNetworkControls"
  );

  assert.ok(
    nodes.some(
      (entry) =>
        typeof entry.type === "function" &&
        entry.type.name === "AssistNetworkDetailsCard"
    ),
    "expected AssistNetworkOverview to render AssistNetworkDetailsCard"
  );

  assert.ok(
    nodes.some(
      (entry) =>
        typeof entry.type === "function" &&
        entry.type.name === "AssistNetworkImpactSection"
    ),
    "expected AssistNetworkOverview to render AssistNetworkImpactSection"
  );

  assert.ok(
    relationshipGraphEntry,
    "expected AssistNetworkOverview to still render the RelationshipGraph surface"
  );

  assert.ok(
    Array.isArray(relationshipGraphEntry.props.relationships),
    "expected AssistNetworkOverview to pass dataset-built assist edges into RelationshipGraph"
  );

  assert.deepEqual(
    relationshipGraphEntry.props.relationships.map((edge) => ({
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        assistCount: edge.assistCount,
        assistPrestige: edge.assistPrestige,
        assistFrequencyPerGame: edge.assistFrequencyPerGame,
      })),
    [
      {
        sourceId: "izzy",
        targetId: "greg",
        assistCount: 1,
        assistPrestige: 3,
        assistFrequencyPerGame: 1,
      },
      {
        sourceId: "greg",
        targetId: "izzy",
        assistCount: 1,
        assistPrestige: 2,
        assistFrequencyPerGame: 1,
      },
      {
        sourceId: "greg",
        targetId: "james",
        assistCount: 1,
        assistPrestige: 1,
        assistFrequencyPerGame: 1,
      },
    ],
    "expected AssistNetworkOverview to derive direct assist edges from unified games"
  );

  assert.equal(
    relationshipGraphEntry.props.assistMode,
    undefined,
    "expected AssistNetworkOverview to stop passing assistMode into RelationshipGraph"
  );
});
