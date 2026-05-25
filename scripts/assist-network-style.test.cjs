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

run("Assist network overview source includes strict exact-scope empty-state copy", () => {
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
    /These older exact-match games only saved aggregate assist totals, not which teammate gave each assist on the turn\./,
    "expected the overview to explain when older exact-match games have assist activity but no saved assist direction"
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
    /buildAssistNetworkDataset\(\{[\s\S]*games:\s*safeGames,[\s\S]*scopedPlayerIds,[\s\S]*exactScopePlayerIds[\s\S]*\}\)/,
    "expected AssistNetworkOverview to derive its graph dataset from unified games, scoped ids, and exact-scope ids"
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
        sourceId: "greg",
        targetId: "izzy",
        assistCount: 1,
        assistPrestige: 3,
        assistFrequencyPerGame: 1,
      },
      {
        sourceId: "izzy",
        targetId: "greg",
        assistCount: 1,
        assistPrestige: 2,
        assistFrequencyPerGame: 1,
      },
      {
        sourceId: "james",
        targetId: "greg",
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

run("Relationship graph source uses geometric assist arrowheads instead of a fixed horizontal triangle", () => {
  const relationshipGraphSource = read(
    path.join("components", "charts", "RelationshipGraph.tsx")
  );

  assert.match(
    relationshipGraphSource,
    /buildArrowPath\(\s*edgeInput as any,\s*safeNum\(edge\.arrowSize,\s*EDGE_ARROW_SIZE\)\s*\)/,
    "expected assist-network arrows to be drawn from the path geometry so reciprocal arrows can point in separate directions"
  );
});

run("Relationship graph offsets reciprocal assist labels so both directions stay readable", () => {
  React.useMemo = (fn) => fn();
  React.useState = (initial) => [
    typeof initial === "function" ? initial() : initial,
    () => {},
  ];
  React.useEffect = () => {};

  const relationshipGraphModule = require(path.join(
    projectRoot,
    "components",
    "charts",
    "RelationshipGraph.tsx"
  ));
  const RelationshipGraph = relationshipGraphModule.default;

  const tree = RelationshipGraph({
    players: [
      { id: "greg", name: "Greg", color: "#3B82F6" },
      { id: "james", name: "James", color: "#22C55E" },
    ],
    relationships: [
      {
        sourceId: "james",
        targetId: "greg",
        assistCount: 6,
        assistPrestige: 4,
        assistFrequencyPerGame: 1.2,
      },
      {
        sourceId: "greg",
        targetId: "james",
        assistCount: 5,
        assistPrestige: 5,
        assistFrequencyPerGame: 1.0,
      },
    ],
    scopedPlayerIds: ["greg", "james"],
    variant: "assist_network",
    mode: "flow",
    showHeader: false,
    showReadoutCards: false,
  });

  const nodes = flatten(tree);
  const label120 = nodes.find(
    (entry) =>
      entry.type === "SvgText" &&
      String(entry.props?.children ?? "") === "1.2/game"
  );
  const label100 = nodes.find(
    (entry) =>
      entry.type === "SvgText" &&
      String(entry.props?.children ?? "") === "1.0/game"
  );

  assert.ok(label120, "expected the graph to render the 1.2/game label");
  assert.ok(label100, "expected the graph to render the 1.0/game label");

  const xDelta = Math.abs(Number(label120.props.x) - Number(label100.props.x));
  const yDelta = Math.abs(Number(label120.props.y) - Number(label100.props.y));

  assert.ok(
    xDelta > 8 || yDelta > 8,
    "expected reciprocal assist labels to render with visibly different positions"
  );
});

run("Assist network overview replaces the graph with a strict warning when exact-match games have no saved assist direction", () => {
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
        totals: {
          greg: { totalPrestige: 10, efficiency: 10, assists: 1 },
          izzy: { totalPrestige: 12, efficiency: 12, assistPrestigeReceived: 2 },
          james: { totalPrestige: 9, efficiency: 9 },
        },
        rounds: [],
      },
    ],
    scopedPlayerIds: ["greg", "izzy", "james"],
    exactScopePlayerIds: ["greg", "izzy", "james"],
  });

  const nodes = flatten(tree);
  const relationshipGraphEntry = nodes.find(
    (entry) =>
      typeof entry.type === "function" && entry.type.name === "RelationshipGraph"
  );

  assert.ok(
    nodes.some(
      (entry) =>
        entry.type === "Text" &&
        String(entry.props?.children ?? "").includes(
          "These older exact-match games only saved aggregate assist totals, not which teammate gave each assist on the turn."
        )
    ),
    "expected the overview to show the strict legacy-data warning"
  );

  assert.equal(
    relationshipGraphEntry,
    undefined,
    "expected the overview to suppress the RelationshipGraph surface for zero-direction exact-match samples"
  );

  assert.equal(
    nodes.some(
      (entry) =>
        typeof entry.type === "function" &&
        entry.type.name === "AssistNetworkDetailsCard"
    ),
    false,
    "expected the overview to suppress the details card when there are no recorded exact-match links"
  );

  assert.ok(
    nodes.some(
      (entry) =>
        typeof entry.type === "function" &&
        entry.type.name === "AssistNetworkImpactSection"
    ),
    "expected the impact section to remain visible under the strict warning"
  );
});
