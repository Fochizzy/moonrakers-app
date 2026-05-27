const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260527195000_moonrakers_safe_intel_partner_name_scope_fix.sql",
);
const source = fs.readFileSync(migrationPath, "utf8");
const fnStart = source.indexOf("create or replace function public.get_player_profile_screen(");
const fnEnd = source.indexOf("$$;", fnStart);
const functionSource =
  fnStart >= 0 && fnEnd > fnStart ? source.slice(fnStart, fnEnd + 3) : source;

assert.match(
  functionSource,
  /create or replace function public\.get_player_profile_screen/i,
  "expected the consolidation migration to patch get_player_profile_screen directly",
);

assert.match(
  functionSource,
  /selected_opponent_id is not null or rollup_payload is null or moonrakers_intel is null or coalesce\(\(moonrakers_intel->>'hasData'\)::boolean,false\)=false/i,
  "expected the player profile screen to keep rebuilding live totals when the stored intel payload is missing or stale",
);

assert.match(
  functionSource,
  /Aggregate assist totals only/i,
  "expected the live Moonrakers Intel fallback to surface the safer aggregate-only assist context status",
);

assert.match(
  functionSource,
  /Directional assist-target timing is intentionally omitted in this safe fallback\./i,
  "expected the fallback to document why directional assist-target metrics stay empty in the safer rebuild path",
);

assert.match(
  functionSource,
  /'mostCommonAssistTarget', most_common_assist_target/i,
  "expected the safer fallback to keep the support-profile target slot explicit in the returned contract",
);

assert.match(
  functionSource,
  /'playerName', support_partner_candidates\.player_name[\s\S]*lower\(support_partner_candidates\.player_name\) asc/i,
  "expected the support-partner subquery to qualify player_name so it does not collide with the PL/pgSQL variable",
);

assert.match(
  functionSource,
  /'assistGapToTargetLabel', null[\s\S]*'assistGapToLeaderLabel', null/i,
  "expected the safer fallback to leave directional assist metrics empty rather than rebuilding them from brittle casts",
);

assert.doesNotMatch(
  functionSource,
  /jsonb_each_text|recipient\.key::uuid|assist_recipients/i,
  "expected the safer fallback to avoid the old assist-recipient parsing path entirely",
);

console.log("player-profile-safe-intel-repair.test.cjs passed");
