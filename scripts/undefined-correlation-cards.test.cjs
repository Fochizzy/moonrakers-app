const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts), "utf8");

const migration = read(
  "supabase",
  "migrations",
  "20260813170000_moonrakers_undefined_correlations_and_assist_threshold.sql",
);

// The helper must live in public: get_insights_screen is not security definer, so a
// private helper is unreachable and every Insights load 500s.
assert.match(
  migration,
  /create or replace function public\.correlation_card/i,
  "expected correlation_card in the public schema",
);

assert.ok(
  !/private\.correlation_card/i.test(migration),
  "expected no private-schema reference to correlation_card",
);

// An undefined statistic must not be reported as a real zero.
assert.match(
  migration,
  /'value',\s*case when value is null then null else round\(value, 2\) end/,
  "expected a null value to stay null rather than collapsing to 0",
);

assert.match(
  migration,
  /when value is null then 'No data'/,
  "expected null correlations to be labelled No data",
);

// This is the regression that made the cards lie: coalesce(corr(...), 0).
const coalescedCorrelations =
  migration.match(/coalesce\(\s*\(?\s*(select\s+)?corr\(/gi) ?? [];
assert.equal(
  coalescedCorrelations.length,
  0,
  "expected no correlation to be coalesced to 0",
);

assert.ok(
  !/coalesce\(\s*\(\s*select public\.seat_advantage_spread/i.test(migration),
  "expected the seat spread not to be coalesced to 0 either",
);

// Undefined pairings must not sort to the top of the list.
assert.ok(
  !/order by abs\(pairing_metrics\.corr_value\) desc,/.test(migration),
  "expected pairing ordering to place nulls last",
);
assert.match(
  migration,
  /order by abs\(pairing_metrics\.corr_value\) desc nulls last/,
  "expected pairing ordering to place nulls last",
);

// Threshold: >5 was unreachable (observed gap-to-leader tops out at exactly 5).
assert.ok(
  !/leader_prestige - helper_state\.pbr\) > 5/.test(migration),
  "expected the unreachable >5 assist threshold to be gone from the insights side",
);
assert.match(
  migration,
  /leader_prestige - helper_state\.pbr\) > 2/,
  "expected the insights assist threshold to be reachable",
);

const profileMigration = read(
  "supabase",
  "migrations",
  "20260813180000_moonrakers_assist_behind_leader_threshold.sql",
);

// Both surfaces share the metric, so they must share the threshold.
assert.ok(
  !/ls\.leader_prestige - h_state\.pbr\) > 5/.test(profileMigration),
  "expected the profile-side threshold to move too",
);
assert.match(
  profileMigration,
  /ls\.leader_prestige - h_state\.pbr\) > 2/,
  "expected the profile-side assist threshold to match the insights side",
);

// Labels follow the threshold.
assert.ok(
  migration.includes("'Assists 3+ Behind Leader vs Victory'"),
  "expected the macro card label to state the real threshold",
);

const catalog = read("utils", "definitionCatalog.ts");
assert.match(
  catalog,
  /title: "Assists 3\+ Behind Leader"/,
  "expected the glossary title to state the real threshold",
);

const targets = read("utils", "definitionTargets.ts");
for (const alias of [
  '"assists 3+ behind leader": "assistsOverFiveBehindLeader"',
  '"assists over 5 behind leader vs victory": "assistsOverFiveBehindLeader"',
]) {
  assert.ok(
    targets.includes(alias),
    `expected definition alias ${alias} so both old and new phrasings resolve`,
  );
}

// Client must render the null instead of folding it back to 0.
const card = read("components", "CorrelationStats.tsx");
assert.match(
  card,
  /value: item\.value === null\s*\n\s*\? null/,
  "expected the server row normalizer to preserve null",
);
assert.match(
  card,
  /value: number \| null;/,
  "expected CorrelationCard to accept a null value",
);
assert.match(
  card,
  /hasValue \? `\$\{notation\} = \$\{formatCorrelation\(safeValue\)\}` : '—'/,
  "expected the card to show a dash rather than 0.00 when there is no value",
);

console.log("undefined-correlation-cards.test.cjs passed");
