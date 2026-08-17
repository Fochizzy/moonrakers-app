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

run("Hubs tab fits five bridge cards into three flexible rows on one page", () => {
  const indexSource = read("app/index.tsx");

  expectIncludes(indexSource, 'viewport="fit"', "fit home viewport");
  expectIncludes(
    indexSource,
    "const bridgeRows = useMemo(",
    "paired hub rows for the fit-screen grid"
  );
  expectIncludes(indexSource, "bridgeDestinations.slice(index, index + 2)", "two tiles per hub row");
  expectIncludes(indexSource, "layout={card.layout ?? (card.iconKey ? \"graphic\" : \"text\")}", "shared hub layout hint");
  expectIncludes(
    indexSource,
    'emphasis={bridgeDestinations.length > 4 ? "default" : "large"}',
    "compact emphasis when the management tile is present"
  );
  expectIncludes(indexSource, "style={[styles.hubTileBase, styles.hubTile]}", "hubs tile style");
  expectIncludes(indexSource, "hubsPanel: {\n    flex: 1,", "hubs panel claims the whole tab body");
  expectIncludes(indexSource, "hubGridRow: {\n    flex: 1,", "hub rows split the panel height evenly");
  expectIncludes(indexSource, "hubTile: {\n    flex: 1,", "hub tiles split their row width evenly");
  expectIncludes(indexSource, "gap: 10", "tighter mobile hub tile spacing");
  expectIncludes(indexSource, 'flexBasis: "auto"', "tile clears the shared half-card flex basis so it can grow");
  // Nothing may pin a tile to a fixed footprint now that the grid fills the page.
  expectNotIncludes(indexSource, "hubTileHalf", "old fixed half-tile style");
  expectNotIncludes(indexSource, "hubTileFullWidth", "old full-width tile style");
  expectNotIncludes(indexSource, "hubWideStack", "old bottom hub action row");
  expectNotIncludes(indexSource, 'width: "47%"', "old fixed half-tile width");
  expectNotIncludes(indexSource, 'width: "48.5%"', "old overly wide half-tile width");
  expectNotIncludes(indexSource, "minHeight: 184", "old half-tile minimum height");
  expectNotIncludes(indexSource, "minHeight: 224", "old tall half-tile minimum height");
  expectNotIncludes(indexSource, 'height: "48.5%"', "old percentage-sized half-tile height");
  expectNotIncludes(indexSource, "marginBottom: 10", "old stacked hub gap");
});

run("Hubs tab exposes the management destination without adding scrolling", () => {
  const hubsSource = read("utils/appHubs.ts");

  expectNotIncludes(hubsSource, '"data-backup"', "backup & export bridge tile");
  expectIncludes(hubsSource, 'title: "Manage Users/Groups"', "manage user/groups bridge tile");
  expectIncludes(hubsSource, 'iconKey: "moneyHub"', "Money.png management icon");
});

if (process.exitCode > 0) {
  throw new Error("home-hubs-fit.test.cjs failed");
}

console.log("home-hubs-fit.test.cjs passed");
