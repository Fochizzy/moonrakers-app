const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const auditPath = path.join(projectRoot, "scripts", "definitions-coverage-audit.cjs");

assert.ok(
  fs.existsSync(auditPath),
  "expected a definitions coverage audit script to exist",
);

const auditSource = fs.readFileSync(auditPath, "utf8");

assert.match(
  auditSource,
  /definitionCatalog/,
  "expected the audit script to use the shared definition catalog as its source of truth",
);

assert.match(
  auditSource,
  /definitionTargets/,
  "expected the audit script to compare UI terms against the shared definition target resolver coverage",
);

assert.match(
  auditSource,
  /app[\\/]analytics\.tsx/,
  "expected the audit script to inspect the analytics hub surface",
);

assert.match(
  auditSource,
  /app[\\/]index\.tsx/,
  "expected the audit script to inspect the home hub surface",
);

assert.match(
  auditSource,
  /app[\\/]insights\.tsx/,
  "expected the audit script to inspect the insights surface",
);

assert.match(
  auditSource,
  /components[\\/]player[\\/]MoonrakersIntelSection\.tsx/,
  "expected the audit script to inspect Moonrakers Intel narrative copy",
);

console.log("definitions-coverage-audit-script.test.cjs passed");
