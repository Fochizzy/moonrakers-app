const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260527202000_moonrakers_restore_exact_assist_intel_contract.sql",
);
const source = fs.readFileSync(migrationPath, "utf8");
const fnStart = source.indexOf("create or replace function public.get_player_profile_screen(");
const fnEnd = source.indexOf("$$;", fnStart);
const functionSource =
  fnStart >= 0 && fnEnd > fnStart ? source.slice(fnStart, fnEnd + 3) : source;

assert.match(
  functionSource,
  /create or replace function public\.get_player_profile_screen/i,
  "expected the final exact-assist migration to patch get_player_profile_screen directly",
);

assert.match(
  functionSource,
  /selected_opponent_id is not null or rollup_payload is null or moonrakers_intel is null or coalesce\(\(moonrakers_intel->>'hasData'\)::boolean,false\)=false/i,
  "expected the player profile screen to keep rebuilding live totals when the stored intel payload is missing or stale",
);

assert.match(
  source,
  /'playerName', support_partner_candidates\.player_name[\s\S]*lower\(support_partner_candidates\.player_name\) asc/i,
  "expected the restored exact-assist helper to keep the qualified support-partner player_name ordering that fixed the scope ambiguity",
);

assert.match(
  functionSource,
  /moonrakers_intel := private\.build_moonrakers_intel_payload\(selected_player_id, selected_opponent_id\);/i,
  "expected the live player profile contract to rebuild opponent-filtered Moonrakers Intel through the shared exact-assist helper",
);

assert.doesNotMatch(
  source,
  /Aggregate assist totals only|Directional assist-target timing is intentionally omitted in this safe fallback\./i,
  "expected the final exact-assist migration to remove the aggregate-only safe-fallback wording",
);

console.log("player-profile-safe-intel-repair.test.cjs passed");
