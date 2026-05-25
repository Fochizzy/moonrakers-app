const fs = require("node:fs");
const path = require("node:path");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function expectMatch(source, regex, label) {
  if (!regex.test(source)) {
    throw new Error(`Missing ${label}: ${regex}`);
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

run("HubTileCard large mode stays readable on fit-screen hubs", () => {
  const source = read("components/ui/HubTileCard.tsx");

  expectMatch(
    source,
    /resolvedLayout === "graphic-horizontal" && isLarge\s*\?\s*styles\.contentHorizontalGraphicLarge/,
    "large horizontal content override"
  );
  expectMatch(
    source,
    /resolvedLayout === "graphic-horizontal" && isLarge\s*\?\s*styles\.copyHorizontalGraphicLarge/,
    "large horizontal copy override"
  );
  expectMatch(
    source,
    /resolvedLayout === "graphic-horizontal" && isLarge\s*\?\s*styles\.titleHorizontalGraphicLarge/,
    "large horizontal title override"
  );
  expectMatch(
    source,
    /resolvedLayout === "graphic-horizontal" && isLarge\s*\?\s*styles\.descriptionHorizontalGraphicLarge/,
    "large horizontal description override"
  );
  expectMatch(
    source,
    /iconFrameLarge:\s*{[\s\S]*?width:\s*110,[\s\S]*?height:\s*110,/,
    "reduced large square art frame"
  );
  expectMatch(
    source,
    /iconLarge:\s*{[\s\S]*?width:\s*78,[\s\S]*?height:\s*78,/,
    "reduced large square art size"
  );
  expectMatch(
    source,
    /iconFrameHorizontalGraphicLarge:\s*{[\s\S]*?width:\s*92,[\s\S]*?height:\s*92,/,
    "balanced large horizontal art frame"
  );
  expectMatch(
    source,
    /iconHorizontalGraphicLarge:\s*{[\s\S]*?width:\s*68,[\s\S]*?height:\s*68,/,
    "balanced large horizontal art size"
  );
  expectMatch(
    source,
    /contentHorizontalGraphicLarge:\s*{[\s\S]*?alignItems:\s*"flex-start",/,
    "large horizontal content left alignment"
  );
  expectMatch(
    source,
    /titleHorizontalGraphicLarge:\s*{[\s\S]*?textAlign:\s*"left",/,
    "large horizontal title left alignment"
  );
  expectMatch(
    source,
    /descriptionHorizontalGraphicLarge:\s*{[\s\S]*?textAlign:\s*"left",/,
    "large horizontal description left alignment"
  );
});

if (process.exitCode > 0) {
  throw new Error("hub-tile-card-fit-balance.test.cjs failed");
}

console.log("hub-tile-card-fit-balance.test.cjs passed");
