const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const targetPath = path.join(projectRoot, "scripts", "shared-app-status.test.ts");

const result = spawnSync(process.execPath, [targetPath], {
  encoding: "utf8",
});

assert.equal(
  result.status,
  0,
  `expected shared-app-status.test.ts to exit cleanly, got ${result.status}\n${result.stderr}`,
);

assert.match(
  result.stdout,
  /shared-app-status\.test\.ts passed/,
  "expected the shared app-status test to report success",
);

assert.doesNotMatch(
  result.stderr,
  /MODULE_TYPELESS_PACKAGE_JSON|Reparsing as ES module|type": "module"/,
  `expected shared-app-status.test.ts to run without module-type warnings, got:\n${result.stderr}`,
);

console.log("shared-app-status-warning.test.cjs passed");
