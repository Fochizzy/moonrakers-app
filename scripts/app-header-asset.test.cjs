const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");

const projectRoot = path.resolve(__dirname, "..");
const appHeaderPath = path.join(projectRoot, "components", "ui", "AppHeader.tsx");
const source = fs.readFileSync(appHeaderPath, "utf8");

const assetMatch = source.match(
  /const HEADER_EMBLEM = require\((["'])(.+?)\1\);/
);

assert.ok(
  assetMatch,
  "Expected AppHeader to declare a static HEADER_EMBLEM require"
);

const assetRequest = assetMatch[2];
const resolvedAssetPath = assetRequest.startsWith("@/")
  ? path.join(projectRoot, assetRequest.slice(2))
  : path.resolve(path.dirname(appHeaderPath), assetRequest);

assert.ok(
  fs.existsSync(resolvedAssetPath),
  `Expected HEADER_EMBLEM asset to exist: ${assetRequest}`
);

const png = PNG.sync.read(fs.readFileSync(resolvedAssetPath));
const cornerSamples = [
  [0, 0],
  [png.width - 1, 0],
  [0, png.height - 1],
  [png.width - 1, png.height - 1],
];

for (const [x, y] of cornerSamples) {
  const idx = (png.width * y + x) << 2;
  assert.equal(
    png.data[idx + 3],
    0,
    `Expected transparent corner at (${x}, ${y}) in ${assetRequest}`
  );
}

console.log("PASS AppHeader emblem asset exists and keeps transparent corners");
