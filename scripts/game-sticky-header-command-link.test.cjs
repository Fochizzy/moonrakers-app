const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "game.tsx"),
  "utf8",
);

assert.match(
  source,
  /appRoutes/,
  "expected the game screen to import the shared app route helpers for Command navigation",
);

assert.match(
  source,
  /<View\s+style=\{\[\s*styles\.heroStickyShell,[\s\S]*<Pressable[\s\S]*router\.push\(APP_ROUTES\.home\)[\s\S]*Back to Command[\s\S]*<\/View>\s*<ScrollView/s,
  "expected the game screen to render a sticky hero shell above the main ScrollView with a Back to Command button",
);

assert.match(
  source,
  /heroStickyShell:\s*\{[\s\S]*zIndex:\s*4,[\s\S]*paddingHorizontal:\s*8,[\s\S]*paddingBottom:\s*8,/,
  "expected the sticky game hero shell to reserve top space and stay visually above the scrolling content",
);

assert.match(
  source,
  /commandButton:\s*\{[\s\S]*alignSelf:\s*'flex-start',[\s\S]*borderRadius:\s*8,/,
  "expected the game screen to define a compact top-right command button style",
);

console.log("game-sticky-header-command-link.test.cjs passed");
