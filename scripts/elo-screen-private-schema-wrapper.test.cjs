const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260527222000_moonrakers_elo_screen_private_schema_wrapper.sql",
);

assert.equal(
  fs.existsSync(migrationPath),
  true,
  "expected a follow-up migration that re-owns get_elo_screen under a private-schema-safe wrapper",
);

const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /(?:create or replace function public\.get_elo_screen\(|alter function public\.get_elo_screen\(uuid,\s*uuid,\s*uuid,\s*text\))/i,
  "expected the repair migration to explicitly target public.get_elo_screen",
);

assert.match(
  source,
  /security definer/i,
  "expected the repair migration to promote get_elo_screen to security definer so private helpers can execute safely",
);

assert.match(
  source,
  /set search_path = ''/i,
  "expected the repair migration to lock the search_path down while the function runs with elevated privileges",
);

assert.match(
  source,
  /private\.elo_expected_score_multi\(/i,
  "expected the repair migration to keep the private ELO helper reachable from the new security-definer wrapper",
);

assert.match(
  source,
  /grant execute on function public\.get_elo_screen\(uuid, uuid, uuid, text\) to authenticated;/i,
  "expected authenticated callers to retain execute access to public.get_elo_screen",
);

console.log("elo-screen-private-schema-wrapper.test.cjs passed");
