const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const layoutSource = fs.readFileSync(
  path.join(projectRoot, "app", "_layout.tsx"),
  "utf8",
);

assert.match(
  layoutSource,
  /lib\/auth\/useSharedCloudBootstrap/,
  "expected app/_layout.tsx to delegate bootstrap orchestration to the shared auth/bootstrap hook",
);

console.log("layout-bootstrap-extraction.test.cjs passed");
