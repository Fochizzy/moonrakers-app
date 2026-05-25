const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260525074716_moonrakers_focused_elo_screen_contract.sql",
);

assert.equal(
  fs.existsSync(migrationPath),
  true,
  "expected the focused ELO screen migration file to exist",
);

const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /create or replace function public\.get_elo_screen/i,
  "expected the migration to define public.get_elo_screen",
);

assert.match(
  source,
  /grant execute on function public\.get_elo_screen/i,
  "expected the migration to grant execute on public.get_elo_screen",
);

console.log("elo-screen-migration.test.cjs passed");
