const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260529211500_moonrakers_legacy_greg_assist_key_repair.sql",
);

assert.ok(
  fs.existsSync(migrationPath),
  "expected a follow-up migration to repair legacy Greg assist keys",
);

const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /create or replace function public\.resolve_game_participant_profile_id\s*\(/i,
  "expected the repair migration to add a shared participant-key resolver for legacy assist keys",
);

assert.match(
  source,
  /legacy-greg/i,
  "expected the repair migration to explicitly cover the legacy-greg key path",
);

assert.match(
  source,
  /update public\.game_rounds[\s\S]*assist_recipients[\s\S]*assist_prestige_recipients/i,
  "expected the repair migration to rewrite both stored assist recipient maps in game_rounds",
);

assert.match(
  source,
  /public\.resolve_game_participant_profile_id\(gr\.game_id,\s*edge\.key\)/i,
  "expected the live insights repair to resolve assist recipients through the shared participant-key resolver",
);

assert.match(
  source,
  /pg_get_functiondef\('public\.get_insights_screen\(uuid\)'::regprocedure\)/i,
  "expected the repair migration to patch the current live get_insights_screen definition in place",
);

assert.doesNotMatch(
  source,
  /recipient\.profile_id\s*=\s*nullif\(edge\.key,\s*''\)::uuid/i,
  "expected the repair migration to stop using the unsafe raw uuid cast for assist recipient joins",
);

console.log("legacy-greg-assist-key-repair.test.cjs passed");
