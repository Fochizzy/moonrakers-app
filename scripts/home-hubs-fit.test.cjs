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

function expectCount(source, pattern, expectedCount, label) {
  const actualCount = source.split(pattern).length - 1;
  if (actualCount !== expectedCount) {
    throw new Error(`Expected ${expectedCount} ${label}, found ${actualCount}: ${pattern}`);
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

run("Hubs tab keeps all five hub cards on one fit-screen layout", () => {
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
  expectIncludes(indexSource, "style={[styles.hubTileBase, styles.hubTileHalf]}", "compact hubs tile style");
  expectIncludes(indexSource, "style={[styles.hubTileBase, styles.hubTileFullWidth]}", "wide profile management tile style");
  expectNotIncludes(indexSource, 'emphasis="large"', "oversized hubs emphasis");
  expectIncludes(indexSource, 'hubGrid: {', "hubs grid style");
  expectIncludes(indexSource, 'hubWideStack: {', "bottom hub action row");
  expectIncludes(indexSource, 'flex: 1,', "screen-filling hubs flex layout");
  expectIncludes(indexSource, 'alignContent: "space-between"', "space-filling hub rows");
  expectIncludes(indexSource, 'height: "48.5%"', "screen-filling half-tile height");
  expectIncludes(indexSource, 'width: "100%"', "full-width bottom tile width");
  expectNotIncludes(indexSource, "minHeight: 176", "short fixed hub tiles");
  expectNotIncludes(indexSource, "marginBottom: 10", "old stacked hub gap");
});

if (process.exitCode > 0) {
  throw new Error("home-hubs-fit.test.cjs failed");
}

console.log("home-hubs-fit.test.cjs passed");
