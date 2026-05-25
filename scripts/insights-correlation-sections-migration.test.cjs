const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");
const migrationNames = fs.readdirSync(migrationsDir);
const migrationName = migrationNames.find((name) =>
  name.includes("moonrakers_insights_correlation_sections"),
);

assert.ok(
  migrationName,
  "expected a follow-up migration that teaches get_insights_screen to emit server-authored pairing, macro, and synergy sections",
);

const source = fs.readFileSync(path.join(migrationsDir, migrationName), "utf8");

assert.match(
  source,
  /create or replace function public\.get_insights_screen/i,
  "expected the follow-up migration to patch get_insights_screen directly",
);

for (const snippet of [
  "'pairing'",
  "'macro'",
  "'synergyPairs'",
  "'players'",
  "assist_prestige_recipients",
  "corr(",
]) {
  assert.ok(
    source.includes(snippet),
    `expected ${path.basename(migrationName)} to contain ${snippet}`,
  );
}

console.log("insights-correlation-sections-migration.test.cjs passed");
