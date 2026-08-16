const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

// Four guards once hard-coded C:/Users/... paths: they passed on the machine
// that wrote them and failed on every other machine, including CI's first-ever
// run. Anything a guard reads must resolve relative to the repo.
const SCAN_DIRS = ["scripts", "app", "components", "lib", "store", "utils", "engine"];
const MACHINE_PATH = /[A-Z]:[\\/]Users[\\/]/;

const offenders = [];

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      scan(full);
      continue;
    }
    if (!/\.(cjs|mjs|js|ts|tsx)$/.test(entry.name)) continue;
    const source = fs.readFileSync(full, "utf8");
    // This guard mentions the pattern in its own comments; skip self.
    if (path.resolve(full) === __filename) continue;
    if (MACHINE_PATH.test(source)) {
      offenders.push(path.relative(projectRoot, full));
    }
  }
}

for (const dir of SCAN_DIRS) {
  const full = path.join(projectRoot, dir);
  if (fs.existsSync(full)) scan(full);
}

assert.deepEqual(
  offenders,
  [],
  `expected no source or guard file to hard-code a machine-specific path:\n  ${offenders.join("\n  ")}`,
);

console.log("no-machine-paths.test.cjs passed");
