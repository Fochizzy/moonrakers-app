const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");
const migrationName = fs
  .readdirSync(migrationsDir)
  .sort()
  .find((name) =>
    name.includes("moonrakers_insights_live_correlation_overlay_fix"),
  );

assert.ok(
  migrationName,
  "expected a follow-up migration that restores live macro and synergy overlays in get_insights_screen",
);

const source = fs.readFileSync(path.join(migrationsDir, migrationName), "utf8");

assert.match(
  source,
  /create or replace function public\.get_insights_screen/i,
  "expected the follow-up migration to patch get_insights_screen directly",
);

for (const snippet of [
  "target_game_ids",
  "pairing_payload",
  "macro_payload",
  "synergy_payload",
  "assist_prestige_recipients",
  "corr(",
]) {
  assert.ok(
    source.includes(snippet),
    `expected ${path.basename(migrationName)} to contain ${snippet}`,
  );
}

assert.match(
  source,
  /jsonb_set\(\s*insights_payload,\s*'\{correlations\}'[\s\S]*'pairing'[\s\S]*'macro'[\s\S]*'synergyPairs'/i,
  "expected the migration to overwrite the correlations payload with live pairing, macro, and synergy data",
);

console.log("insights-live-correlation-overlay-fix.test.cjs passed");
