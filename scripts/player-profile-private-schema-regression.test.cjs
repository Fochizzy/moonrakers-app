// public.get_player_profile_screen is security invoker, and the authenticated
// role has no USAGE on the private schema, so it has to reach the intel builder
// through the public security-definer wrapper. 20260527213500 installed that
// swap as a text patch and 20260813180000 silently undid it by re-creating the
// function from source — every profile read for another player failed with
// "permission denied for schema private" until it was patched again.
//
// This guard fails the moment a new migration re-creates the function without a
// later one restoring the wrapper.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");

const migrations = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => ({
    file,
    source: fs.readFileSync(path.join(migrationsDir, file), "utf8"),
  }));

const CREATES_SCREEN =
  /create\s+or\s+replace\s+function\s+public\.get_player_profile_screen\s*\(/i;
const DIRECT_PRIVATE_CALL = /private\.build_moonrakers_intel_payload\(\s*selected_player_id/;
const RESTORES_WRAPPER =
  /public\.get_player_profile_moonrakers_intel\(\s*profile_id,\s*selected_player_id/;

const lastDirectDefinition = migrations
  .filter(
    (migration) =>
      CREATES_SCREEN.test(migration.source) &&
      DIRECT_PRIVATE_CALL.test(migration.source),
  )
  .at(-1);

const lastWrapperRestore = migrations
  .filter((migration) => RESTORES_WRAPPER.test(migration.source))
  .at(-1);

assert.ok(
  lastWrapperRestore,
  "expected a migration routing get_player_profile_screen through public.get_player_profile_moonrakers_intel",
);

if (lastDirectDefinition) {
  assert.ok(
    lastWrapperRestore.file > lastDirectDefinition.file,
    `${lastDirectDefinition.file} re-creates public.get_player_profile_screen with a direct private.build_moonrakers_intel_payload() call; add a later migration restoring the public security-definer wrapper (newest restore is ${lastWrapperRestore.file})`,
  );
}

const fixPath = path.join(
  migrationsDir,
  "20260816160000_moonrakers_player_profile_private_schema_regression_fix.sql",
);

assert.ok(
  fs.existsSync(fixPath),
  "expected the follow-up migration that re-applies the private-schema wrapper",
);

const fixSource = fs.readFileSync(fixPath, "utf8");

assert.ok(
  fixSource.includes("still reaches into the private schema"),
  "expected the repair migration to assert the patch actually stuck",
);

console.log("player-profile-private-schema-regression.test.cjs passed");
