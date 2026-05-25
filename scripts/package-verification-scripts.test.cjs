const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const pkg = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
);

for (const key of ["lint", "lint:all", "typecheck", "test:analytics", "test:ui"]) {
  assert.equal(
    typeof pkg.scripts?.[key],
    "string",
    `expected package.json to define script ${key}`,
  );
}

console.log("package-verification-scripts.test.cjs passed");
