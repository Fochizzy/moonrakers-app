const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const heroSource = fs.readFileSync(
  path.join(projectRoot, "components", "charts", "ChartSetupHeroBar.tsx"),
  "utf8",
);
const railSource = fs.readFileSync(
  path.join(projectRoot, "components", "charts", "ChartSetupGuidedRail.tsx"),
  "utf8",
);

assert.match(
  heroSource,
  /ChartHubPreview/,
  "expected the lightweight hero bar to keep the selected chart preview glyph",
);

assert.match(
  heroSource,
  /title:\s*string;[\s\S]*takeaway:\s*string;[\s\S]*chips:\s*string\[];/,
  "expected the hero bar API to stay intentionally slim: title, takeaway, chips",
);

assert.match(
  heroSource,
  /Edit Setup|Close Setup/,
  "expected the hero bar to carry the setup-entry or setup-exit route action",
);

assert.match(
  railSource,
  /type ChartSetupStageShellProps = \{/,
  "expected the guided rail to define a dedicated stage-shell contract",
);

assert.match(
  railSource,
  /status:\s*"active"\s*\|\s*"completed"\s*\|\s*"locked"/,
  "expected guided rail stages to render the approved active/completed/locked states",
);

assert.match(
  railSource,
  /Edit/,
  "expected completed stages to expose an Edit affordance",
);

assert.match(
  railSource,
  /Unlocks after/,
  "expected locked stages to explain why they are muted",
);

console.log("chart-guided-rail-structure.test.cjs passed");
