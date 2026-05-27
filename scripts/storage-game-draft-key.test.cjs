const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "utils", "storage", "storage.ts"),
  "utf8",
);

assert.match(
  source,
  /gameDraft:\s*STORAGE_KEYS\.GAME_DRAFT/,
  "expected storage.ts to map gameDraft to STORAGE_KEYS.GAME_DRAFT explicitly",
);

assert.doesNotMatch(
  source,
  /key\.toUpperCase\(\)/,
  "expected storage.ts to stop deriving storage keys with key.toUpperCase() because camelCase schema keys break AsyncStorage lookups",
);

console.log("storage-game-draft-key.test.cjs passed");
