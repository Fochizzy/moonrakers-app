const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

assert.equal(
  fs.existsSync(path.join(projectRoot, "app", "PlayerProfileScreen.tsx")),
  false,
  "expected the stale PlayerProfileScreen stub to be removed",
);

assert.equal(
  fs.existsSync(path.join(projectRoot, "utils", "number.ts")),
  false,
  "expected the redundant utils/number.ts helper to be removed",
);

console.log("legacy-cleanup-guards.test.cjs passed");
