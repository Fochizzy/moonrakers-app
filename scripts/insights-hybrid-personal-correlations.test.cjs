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
const definitionTargetsPath = path.join(
  projectRoot,
  "utils",
  "definitionTargets.ts",
);

assert.ok(
  fs.existsSync(migrationPath),
  "expected the hybrid personal correlations migration to exist",
);

const migrationSource = fs.readFileSync(migrationPath, "utf8");
const definitionTargetsSource = fs.readFileSync(definitionTargetsPath, "utf8");

assert.match(
  migrationSource,
  /personal_payload\s+jsonb\s*:=\s*'\[\]'::jsonb;/,
  "expected get_insights_screen to declare a dedicated personal payload for the hybrid insights panel",
);

assert.match(
  migrationSource,
  /'label',\s*'Stay at Base Rate vs Victory'/,
  "expected the hybrid personal correlations payload to publish Stay at Base Rate vs Victory",
);

assert.match(
  migrationSource,
  /'label',\s*'Stay at Base Rate vs Objective Points'/,
  "expected the hybrid personal correlations payload to publish Stay at Base Rate vs Objective Points",
);

assert.match(
  migrationSource,
  /'label',\s*'Seat to Win Correlation'/,
  "expected the hybrid personal correlations payload to publish Seat to Win Correlation",
);

assert.match(
  migrationSource,
  /'label',\s*'Late Lead Conversion'/,
  "expected the hybrid personal correlations payload to publish Late Lead Conversion",
);

assert.match(
  migrationSource,
  /'label',\s*'Assist Leader Prestige Gap vs Victory'/,
  "expected the hybrid personal correlations payload to keep Assist Leader Prestige Gap vs Victory in the personal rows",
);

assert.match(
  migrationSource,
  /'metricKey',\s*'assistGapToLeader'/,
  "expected the hybrid personal correlations payload to tag Assist Leader Prestige Gap with the shared metric key",
);

assert.match(
  migrationSource,
  /'label',\s*'Assists at 6\+ Prestige vs Victory'/,
  "expected the hybrid personal correlations payload to keep Assists at 6+ Prestige vs Victory in the personal rows",
);

assert.match(
  migrationSource,
  /'metricKey',\s*'assistsAtSixPlus'/,
  "expected the hybrid personal correlations payload to tag Assists at 6+ Prestige with the shared metric key",
);

assert.match(
  migrationSource,
  /personal_payload\s*:=\s*case\s+when\s+jsonb_array_length\(personal_payload\)\s*>\s*0\s+then\s+personal_payload\s+else\s+existing_personal\s+end;/,
  "expected live personal rows to fall back to any persisted personal payload only when the new hybrid rows are empty",
);

assert.match(
  migrationSource,
  /'personal',\s*personal_payload,/,
  "expected the live insights correlations payload to publish the computed personal rows instead of the old pass-through payload",
);

assert.match(
  definitionTargetsSource,
  /"late lead conversion":\s*"lateLeadConversion"/,
  "expected definition aliases to resolve Late Lead Conversion cards",
);

assert.match(
  definitionTargetsSource,
  /"assist target prestige gap vs victory":\s*"assistGapToTarget"/,
  "expected definition aliases to resolve Assist Target Prestige Gap cards from the insights panel",
);

assert.match(
  definitionTargetsSource,
  /"assists at 6 plus prestige vs victory":\s*"assistsAtSixPlus"/,
  "expected definition aliases to resolve Assists at 6+ Prestige cards from the insights panel",
);

assert.match(
  definitionTargetsSource,
  /"assist leader prestige gap vs victory":\s*"assistGapToLeader"/,
  "expected definition aliases to resolve Assist Leader Prestige Gap cards from the insights panel",
);

assert.match(
  definitionTargetsSource,
  /"assists over 5 behind leader vs victory":\s*"assistsOverFiveBehindLeader"/,
  "expected definition aliases to resolve Assists Over 5 Behind Leader cards from the insights panel",
);

assert.match(
  definitionTargetsSource,
  /"assist prestige gained vs victory":\s*"assistPrestigeGained"/,
  "expected definition aliases to resolve Assist Prestige Gained cards from the insights panel",
);

console.log("insights-hybrid-personal-correlations.test.cjs passed");
