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

assert.doesNotMatch(
  layoutSource,
  /async function loadHydratedSharedSnapshot/,
  "expected app/_layout.tsx to stop defining the shared cloud bootstrap loader inline",
);

assert.doesNotMatch(
  layoutSource,
  /loadCloudSnapshot|loadStatsSnapshot/,
  "expected app/_layout.tsx to stop importing low-level shared-cloud bootstrap primitives directly",
);

console.log("layout-bootstrap-extraction.test.cjs passed");
