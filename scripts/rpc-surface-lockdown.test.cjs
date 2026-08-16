const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationDir = path.join(projectRoot, "supabase", "migrations");

// Postgres grants EXECUTE to PUBLIC by default, which left every exposed RPC --
// including delete_my_profile and save_completed_game -- callable by the anon
// role. The lockdown migration revokes that and re-grants to the signed-in
// roles only. This guard keeps the migration from being quietly gutted.

const migrationFile = fs
  .readdirSync(migrationDir)
  .filter((file) => file.includes("lock_rpc_surface"))
  .at(-1);

assert.ok(migrationFile, "expected the RPC surface lockdown migration to exist");

const source = fs.readFileSync(path.join(migrationDir, migrationFile), "utf8");

for (const fn of [
  "public.delete_my_profile()",
  "public.save_completed_game(jsonb)",
  "public.get_game_history(uuid, integer, timestamptz, uuid, uuid)",
  "public.search_profiles_by_player_name(text)",
]) {
  assert.ok(
    source.includes(`'${fn}'`),
    `expected the lockdown list to include ${fn}`,
  );
}

assert.match(
  source,
  /revoke execute on all functions in schema public from public, anon/,
  "expected the migration to revoke logged-out execute across the whole current surface",
);

assert.match(
  source,
  /alter default privileges in schema public\s+revoke execute on functions from public/,
  "expected future public functions created by the migration role to start locked down",
);

assert.match(
  source,
  /grant execute on function %s to authenticated/,
  "expected signed-in users to keep their access after the PUBLIC revoke",
);

assert.match(
  source,
  /alter function public\.correlation_card\(text, text, text, numeric\) set search_path = public;/,
  "expected the mutable search_path helpers to be pinned",
);

assert.match(
  source,
  /create index if not exists client_error_reports_profile_id_idx/,
  "expected the crash-report foreign key to gain a covering index",
);

for (const indexName of [
  "profiles_deleted_at_idx",
  "games_group_id_idx",
  "games_host_profile_id_idx",
  "games_winner_profile_id_idx",
]) {
  assert.ok(
    source.includes(`drop index if exists public.${indexName};`),
    `expected the unused-index cleanup to drop ${indexName}`,
  );
}

console.log("rpc-surface-lockdown.test.cjs passed");
