const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260529190347_moonrakers_additional_macro_correlations_live_fix.sql",
);

assert.ok(
  fs.existsSync(migrationPath),
  "expected the latest hybrid insights migration to exist",
);

const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /create or replace function public\.get_insights_screen/i,
  "expected the hybrid insights migration to patch get_insights_screen directly",
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
    `expected ${path.basename(migrationPath)} to contain ${snippet}`,
  );
}

for (const label of [
  "Contracts / Failures Ratio vs Win Rate",
  "Assists Given vs Win Rate",
  "Assists Received vs Win Rate",
  "Early Lead vs Final Win",
  "Assist Target Prestige Gap vs Victory",
  "Assist Leader Prestige Gap vs Victory",
  "Assists at 6+ Prestige vs Victory",
  "Assists Over 5 Behind Leader vs Victory",
  "Assist Prestige Gained vs Victory",
  "Late Lead Conversion",
  "Tempo Control",
  "Seat to Win Correlation",
  "Interaction Index",
]) {
  assert.match(
    source,
    new RegExp(`'label',\\s*'${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`),
    `expected the live insights macro payload to publish ${label}`,
  );
}

for (const metricKey of [
  "assistGapToTarget",
  "assistGapToLeader",
  "assistsAtSixPlus",
  "lateLeadConversion",
  "tempoControl",
  "turnOrderWinCorrelation",
  "interactionIndex",
]) {
  assert.match(
    source,
    new RegExp(`'metricKey',\\s*'${metricKey}'`),
    `expected the live insights macro payload to include metricKey ${metricKey}`,
  );
}

assert.match(
  source,
  /macro_payload\s*:=\s*case\s+when\s+jsonb_array_length\(macro_payload\)\s*>\s*0\s+then\s+macro_payload\s+else\s+existing_macro\s+end;/i,
  "expected live macro rows to take precedence over persisted macro payloads when fresh values were computed",
);

assert.match(
  source,
  /jsonb_set\(\s*insights_payload,\s*'\{correlations\}'[\s\S]*'pairing'[\s\S]*'macro'[\s\S]*'synergyPairs'/i,
  "expected the migration to overwrite the correlations payload with live pairing, macro, and synergy data",
);

console.log("insights-live-correlation-overlay-fix.test.cjs passed");
