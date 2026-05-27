const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");

const expectedPresent = [
  "20260527173443_moonrakers_restore_chart_rpc_contracts.sql",
  "20260527181654_moonrakers_persist_rollup_intel_and_assist_network.sql",
  "20260527195000_moonrakers_safe_intel_partner_name_scope_fix.sql",
  "20260527201000_moonrakers_consolidate_chart_contract_cleanup.sql",
  "20260527202000_moonrakers_restore_exact_assist_intel_contract.sql",
  "20260527202100_moonrakers_restore_most_common_assist_target.sql",
];

const expectedAbsent = [
  "20260527173951_moonrakers_fix_player_profile_signed_in_priority_ambiguity.sql",
  "20260527174133_moonrakers_fix_player_profile_recent_games_aggregate.sql",
  "20260527174301_moonrakers_fix_player_profile_live_intel_aggregates.sql",
  "20260527174517_moonrakers_disable_broken_player_profile_live_intel_fallback.sql",
  "20260527191500_moonrakers_chart_rollup_meta_and_safe_intel_consolidation.sql",
  "20260527194000_moonrakers_safe_intel_cte_scope_fix.sql",
];

for (const filename of expectedPresent) {
  assert.ok(
    fs.existsSync(path.join(migrationsDir, filename)),
    `expected cleaned-up migration chain to keep ${filename}`,
  );
}

for (const filename of expectedAbsent) {
  assert.ok(
    !fs.existsSync(path.join(migrationsDir, filename)),
    `expected cleaned-up migration chain to drop ${filename}`,
  );
}

console.log("may-27-migration-chain-hygiene.test.cjs passed");
