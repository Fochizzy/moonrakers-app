const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260813120000_moonrakers_seat_advantage_spread.sql",
);

assert.ok(
  fs.existsSync(migrationPath),
  "expected the seat advantage spread migration to exist",
);

const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /create or replace function (private|public)\.seat_advantage_spread/i,
  "expected the migration to define the shared seat advantage helper",
);

assert.match(
  source,
  /create or replace function public\.get_insights_screen/i,
  "expected the migration to recreate get_insights_screen",
);

assert.match(
  source,
  /create or replace function private\.phase1_turn_order_summary/i,
  "expected the migration to recreate the stats-screen turn-order summary",
);

// The whole point of the migration: no seat metric may fall back to corr() on the
// seat index, which reads 0 whenever the seat effect is not monotonic.
assert.ok(
  !/corr\(\s*player_game_samples\.start_seat/i.test(source),
  "expected the macro and personal seat metrics to stop using Pearson corr() on start_seat",
);

assert.ok(
  !/corr\(corr_source\.seat_value/i.test(source),
  "expected the turn-order summary to stop using Pearson corr() on the seat value",
);

// Every seat surface in this migration must route through the one helper, so the
// numbers on Insights and Stats cannot drift apart.
const helperMentions = (source.match(/private\.seat_advantage_spread\(/g) ?? []).length;
const helperDefinitions = (
  source.match(/create or replace function private\.seat_advantage_spread\(/gi) ?? []
).length;

assert.equal(helperDefinitions, 1, "expected exactly one helper definition");
assert.equal(
  helperMentions - helperDefinitions,
  3,
  "expected the helper to back the macro card, the personal card, and the turn-order summary",
);

// The superseding migration is what actually runs in production. 20260813120000 put
// the helper in the private schema, which broke every Insights load with
// "permission denied for schema private" -- public.get_insights_screen is not
// security definer, so it executes as the caller and cannot reach private.
const schemaFixPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260813150000_moonrakers_seat_helper_public_schema.sql",
);

assert.ok(
  fs.existsSync(schemaFixPath),
  "expected the schema fix migration to exist",
);

const schemaFixSource = fs.readFileSync(schemaFixPath, "utf8");

assert.ok(
  !/private\.seat_advantage_spread/i.test(
    schemaFixSource.replace(/^drop function if exists private\.seat_advantage_spread.*$/im, ""),
  ),
  "expected the schema fix to call the helper through public, never private",
);

assert.match(
  schemaFixSource,
  /create or replace function public\.seat_advantage_spread/i,
  "expected the helper to live in the public schema so non-definer callers can reach it",
);

assert.match(
  schemaFixSource,
  /drop function if exists private\.seat_advantage_spread/i,
  "expected the unreachable private copy to be retired",
);

console.log("seat-advantage-spread-migration.test.cjs checked the schema fix");

// start_order is 0-based in game_participants; the helper drops seats below 1, so
// the turn-order summary has to shift into 1-based seats before calling in.
assert.match(
  source,
  /\(gp\.start_order \+ 1\)::numeric as seat_value/,
  "expected the turn-order summary to shift start_order into 1-based seats",
);

for (const label of ["Seat Advantage Spread"]) {
  assert.ok(
    source.includes(`'label', '${label}'`),
    `expected the migration to publish the ${label} card label`,
  );
}

assert.ok(
  !source.includes("'label', 'Seat to Win Correlation'"),
  "expected the old correlation label to be gone from the payload",
);

console.log("seat-advantage-spread-migration.test.cjs passed");
