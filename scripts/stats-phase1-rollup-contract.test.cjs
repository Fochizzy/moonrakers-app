const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260527143000_moonrakers_phase1_additional_stats_turn_order.sql",
);
const typesPath = path.join(
  projectRoot,
  "lib",
  "cloud",
  "analytics",
  "types.ts",
);

assert.equal(
  fs.existsSync(migrationPath),
  true,
  "expected the phase-1 stats migration to exist",
);

const migrationSource = fs.readFileSync(migrationPath, "utf8");

for (const rpcName of ["get_stats_screen", "get_insights_screen"]) {
  assert.match(
    migrationSource,
    new RegExp(`create or replace function public\\.${rpcName}`, "i"),
    `expected the migration to patch ${rpcName}`,
  );
}

for (const renamedBase of [
  "get_stats_screen_phase1_base_20260527",
  "get_insights_screen_phase1_base_20260527",
]) {
  assert.ok(
    migrationSource.includes(renamedBase),
    `expected the migration to preserve the previous implementation as ${renamedBase}`,
  );
}

for (const requiredKey of [
  "formClosing",
  "pressureContext",
  "assistGapToLeader",
  "turnOrderOverview",
  "turnOrderByTableSize",
  "turnOrderSummary",
  "lateLeadConversion",
  "tempoControl",
  "turnOrderWinCorrelation",
  "interactionIndex",
]) {
  assert.ok(
    migrationSource.includes(requiredKey),
    `expected ${path.basename(migrationPath)} to publish ${requiredKey}`,
  );
}

assert.match(
  migrationSource,
  /jsonb_set\([\s\S]*\{overview,formClosing\}/i,
  "expected the stats payload to publish overview.formClosing",
);

assert.match(
  migrationSource,
  /jsonb_set\([\s\S]*\{players,detail,pressureContext\}/i,
  "expected the stats payload to publish players.detail.pressureContext",
);

assert.match(
  migrationSource,
  /jsonb_set\([\s\S]*\{games,turnOrderOverview\}/i,
  "expected the stats payload to publish games.turnOrderOverview",
);

assert.match(
  migrationSource,
  /jsonb_set\([\s\S]*\{games,turnOrderByTableSize\}/i,
  "expected the stats payload to publish games.turnOrderByTableSize",
);

assert.match(
  migrationSource,
  /jsonb_set\([\s\S]*\{correlations,turnOrderSummary\}/i,
  "expected the stats payload to publish correlations.turnOrderSummary",
);

assert.match(
  migrationSource,
  /jsonb_set\([\s\S]*\{correlations,macro\}/i,
  "expected the insights payload to publish correlations.macro",
);

assert.match(
  migrationSource,
  /target_profile_id uuid := coalesce\(profile_id,\s*auth\.uid\(\)\)/i,
  "expected the stats wrapper to normalize a null profile_id before applying overlays",
);

assert.match(
  migrationSource,
  /jsonb_array_elements\(coalesce\(existing_macro_rows,\s*'\[\]'::jsonb\)\)[\s\S]*jsonb_array_elements\(coalesce\(featured_macro_rows,\s*'\[\]'::jsonb\)\)/i,
  "expected the migration to reconcile existing macro rows before appending featured overlays",
);

assert.match(
  migrationSource,
  /coalesce\([\s\S]*regexp_replace\(trim\([^)]*->>'key'\),\s*'[^']+',\s*'',\s*'g'\)[\s\S]*regexp_replace\(trim\([^)]*->>'label'\),\s*'[^']+',\s*'',\s*'g'\)/i,
  "expected macro reconciliation to match rows by normalized key or normalized label",
);

assert.match(
  migrationSource,
  /format\('__legacy__:%s:%s',\s*[^,]+sort_bucket,\s*[^)]+ordinal\)/i,
  "expected macro reconciliation to preserve rows without a safe identity instead of collapsing them",
);

assert.equal(
  fs.existsSync(typesPath),
  true,
  "expected analytics types to exist",
);

const typesSource = fs.readFileSync(typesPath, "utf8");

for (const typeExport of [
  "AnalyticsTurnOrderRow",
  "AnalyticsTurnOrderGroup",
  "AnalyticsMetricCluster",
  "AnalyticsTurnOrderSummary",
  "AnalyticsCorrelationRow",
  "AnalyticsCorrelationPlayerOption",
  "AnalyticsSynergyPairRow",
  "InsightsCorrelationsPayload",
]) {
  assert.match(
    typesSource,
    new RegExp(`export type ${typeExport}\\s*=`, "m"),
    `expected analytics types to export ${typeExport}`,
  );
}

for (const typedSurface of [
  "formClosing?: AnalyticsMetricCluster",
  "pressureContext?: AnalyticsMetricCluster",
  "turnOrderOverview?: AnalyticsTurnOrderRow[]",
  "turnOrderByTableSize?: AnalyticsTurnOrderGroup[]",
  "turnOrderSummary?: AnalyticsTurnOrderSummary | null",
  "macro?: AnalyticsCorrelationRow[]",
  "players?: AnalyticsCorrelationPlayerOption[]",
  "playerOptions?: AnalyticsCorrelationPlayerOption[]",
  "winLoseSplit?: AnalyticsCorrelationRow[]",
  "synergyPairs?: AnalyticsSynergyPairRow[]",
  "correlations: InsightsCorrelationsPayload",
]) {
  assert.ok(
    typesSource.includes(typedSurface),
    `expected analytics types to include ${typedSurface}`,
  );
}

console.log("stats-phase1-rollup-contract.test.cjs passed");
