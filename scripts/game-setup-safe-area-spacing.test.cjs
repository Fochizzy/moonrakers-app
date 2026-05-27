const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "game-setup.tsx"),
  "utf8",
);

assert.match(
  source,
  /pageContent:\s*\{[\s\S]*paddingTop:\s*0,[\s\S]*paddingBottom:\s*32,[\s\S]*\}/s,
  "expected game setup to remove extra top padding and keep a stronger bottom buffer above Android nav",
);

assert.match(
  source,
  /topActionRow:\s*\{[\s\S]*paddingTop:\s*0,[\s\S]*\}/s,
  "expected the Start Game row to stop adding its own extra top gap",
);

console.log("game-setup-safe-area-spacing.test.cjs passed");
