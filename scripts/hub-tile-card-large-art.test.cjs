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

run("HubTileCard supports large artwork for square and horizontal hub layouts", () => {
  const source = read("components/ui/HubTileCard.tsx");

  expectIncludes(source, 'emphasis?: "default" | "large"', "large emphasis prop");
  expectIncludes(
    source,
    'resolvedLayout === "graphic-horizontal" && isLarge',
    "large horizontal art condition"
  );
  expectIncludes(source, "styles.iconFrameLarge", "large square art frame");
  expectIncludes(source, "styles.iconLarge", "large square art icon");
  expectIncludes(
    source,
    "styles.iconFrameHorizontalGraphicLarge",
    "large horizontal art frame"
  );
  expectIncludes(
    source,
    "styles.iconHorizontalGraphicLarge",
    "large horizontal art icon"
  );
});

if (process.exitCode > 0) {
  throw new Error("hub-tile-card-large-art.test.cjs failed");
}

console.log("hub-tile-card-large-art.test.cjs passed");
