const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");
const snippets = [
  "Assist Target Prestige Gap vs Victory",
  "Assist Leader Prestige Gap vs Victory",
  "Assists at 6+ Prestige vs Victory",
  "Assists Over 5 Behind Leader vs Victory",
  "Assist Prestige Gained vs Victory",
  "personal_assist_target_gap",
  "personal_assist_leader_gap",
  "personal_assists_at_six_plus",
  "personal_assists_over_five_behind",
  "personal_assist_prestige_gained",
  "assist_recipients",
  "assist_prestige_recipients",
  "round_index",
  "corr(",
];
const fileName = fs
  .readdirSync(migrationsDir)
  .sort()
  .reverse()
  .find((name) => {
    const source = fs.readFileSync(path.join(migrationsDir, name), "utf8");
    return (
      /create or replace function public\.get_insights_screen/i.test(source) &&
      snippets.every((snippet) => source.includes(snippet))
    );
  });

assert.ok(
  fileName,
  "expected an insights-screen migration to include the assist-context correlation rollout",
);

const source = fs.readFileSync(path.join(migrationsDir, fileName), "utf8");

assert.match(
  source,
  /create or replace function public\.get_insights_screen/i,
  "expected the insights migration to patch get_insights_screen directly",
);

for (const snippet of [
  ...snippets,
  "'personal'",
  "where assist_context_samples.profile_id=target_profile_id",
]) {
  assert.ok(
    source.toLowerCase().includes(snippet.toLowerCase()),
    `expected ${path.basename(fileName)} to contain ${snippet}`,
  );
}

console.log("insights-assist-context-correlations-migration.test.cjs passed");
