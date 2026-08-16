const fs = require("node:fs");
const path = require("node:path");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function expectIncludes(source, pattern, label) {
  if (!source.includes(pattern)) {
    throw new Error(`Missing ${label}: ${pattern}`);
  }
}

function expectNotIncludes(source, pattern, label) {
  if (source.includes(pattern)) {
    throw new Error(`Unexpected ${label}: ${pattern}`);
  }
}

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

run("Hubs tab keeps the four bridge cards visible in a mobile 2x2 fit-screen layout", () => {
  const indexSource = read("app/index.tsx");

  expectIncludes(indexSource, 'viewport="fit"', "fit home viewport");
  expectIncludes(
    indexSource,
    "const compactBridgeDestinations = useMemo(",
    "compact hub list for the 2x2 grid"
  );
  expectIncludes(
    indexSource,
    "const featuredBridgeDestinations = useMemo(",
    "full-width hub list for the bottom action row"
  );
  expectIncludes(indexSource, "layout={card.layout ?? (card.iconKey ? \"graphic\" : \"text\")}", "shared hub layout hint");
  expectIncludes(indexSource, 'emphasis="large"', "large hubs emphasis");
  expectIncludes(indexSource, "style={[styles.hubTileBase, styles.hubTileHalf]}", "compact hubs tile style");
  expectIncludes(indexSource, "style={[styles.hubTileBase, styles.hubTileFullWidth]}", "wide profile management tile style");
  expectIncludes(indexSource, 'hubGrid: {', "hubs grid style");
  expectIncludes(indexSource, 'hubWideStack: {', "bottom hub action row");
  expectIncludes(indexSource, 'width: "100%"', "full-width hubs grid footprint");
  expectIncludes(indexSource, 'alignContent: "flex-start"', "top-aligned hub rows");
  expectIncludes(indexSource, "gap: 10", "tighter mobile hub tile spacing");
  expectIncludes(indexSource, 'width: "47%"', "narrower half-tile width so two cards fit per row");
  expectIncludes(indexSource, "minHeight: 184", "shorter half-tile minimum height for above-the-fold fit");
  expectIncludes(indexSource, 'width: "100%"', "full-width bottom tile width");
  expectIncludes(indexSource, 'flexBasis: "auto"', "wide tile clears the half-card flex basis so it can sit below the grid cleanly");
  expectIncludes(indexSource, "flexShrink: 0", "bottom hub action row stays in its own row");
  expectNotIncludes(indexSource, 'width: "48.5%"', "old overly wide half-tile width");
  expectNotIncludes(indexSource, "minHeight: 224", "old tall half-tile minimum height");
  expectNotIncludes(indexSource, 'height: "48.5%"', "old percentage-sized half-tile height");
  expectNotIncludes(indexSource, "marginBottom: 10", "old stacked hub gap");
  expectNotIncludes(indexSource, "hubGrid: {\n    flex: 1,", "old flexible grid height that let the wide tile overlap");
});

if (process.exitCode > 0) {
  throw new Error("home-hubs-fit.test.cjs failed");
}

console.log("home-hubs-fit.test.cjs passed");
