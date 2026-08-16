const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

// `npm run typecheck` is only worth trusting if it actually sees every live
// source directory. This config used to carry a long per-file exclude list —
// route files among them — so tsc passed while excluded screens were broken.
const tsconfig = JSON.parse(
  fs
    .readFileSync(path.join(projectRoot, "tsconfig.json"), "utf8")
    // Tolerate comments if this file ever gains them.
    .replace(/^\s*\/\/.*$/gm, ""),
);

const SOURCE_DIRS = [
  "app",
  "components",
  "engine",
  "lib",
  "store",
  "theme",
  "utils",
];

for (const dir of SOURCE_DIRS) {
  if (!fs.existsSync(path.join(projectRoot, dir))) continue;

  assert.ok(
    tsconfig.include?.includes(`${dir}/**/*.ts`),
    `expected tsconfig include to cover ${dir}/**/*.ts`,
  );
  assert.ok(
    tsconfig.include?.includes(`${dir}/**/*.tsx`),
    `expected tsconfig include to cover ${dir}/**/*.tsx`,
  );
}

const ALLOWED_EXCLUDES = new Set([
  "node_modules",
  "dist",
  "build",
  "**/*.bak",
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.spec.ts",
  "**/*.spec.tsx",
]);

for (const entry of tsconfig.exclude ?? []) {
  assert.ok(
    ALLOWED_EXCLUDES.has(entry),
    `unexpected tsconfig exclude "${entry}" — excluding live source files hides real type errors`,
  );
}

console.log("typecheck-coverage.test.cjs passed");
