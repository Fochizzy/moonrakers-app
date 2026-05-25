const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");
const analyticsMigrations = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.includes("moonrakers"));

const offenders = [];

for (const migrationName of analyticsMigrations) {
  const source = fs.readFileSync(path.join(migrationsDir, migrationName), "utf8");
  const matches = [...source.matchAll(/where\s+rollup\.profile_id\s*=\s*profile_id\s*;/gi)];

  for (const match of matches) {
    offenders.push(`${migrationName}: ${match[0]}`);
  }
}

assert.deepEqual(
  offenders,
  [],
  `expected analytics migrations to qualify profile_id in rollup filters, found:\n${offenders.join("\n")}`,
);

console.log("server-authored-analytics-profile-id-qualification.test.cjs passed");
