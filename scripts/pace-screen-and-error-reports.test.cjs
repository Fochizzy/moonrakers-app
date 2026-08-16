const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(projectRoot, ...parts), "utf8");
}

// --- migration contract -----------------------------------------------------
const migrationDir = path.join(projectRoot, "supabase", "migrations");
const migrationFile = fs
  .readdirSync(migrationDir)
  .filter((file) => file.includes("pace_screen_and_error_reports"))
  .at(-1);

assert.ok(migrationFile, "expected the pace/error-reports migration to exist");
const migrationSource = read("supabase", "migrations", migrationFile);

assert.match(
  migrationSource,
  /create or replace function public\.get_pace_screen\(/,
  "expected the migration to define the get_pace_screen RPC",
);

assert.match(
  migrationSource,
  /between 10 and 1800/,
  "expected pace gaps to exclude same-breath linked rounds and interruptions",
);

assert.match(
  migrationSource,
  /percentile_cont\(0\.5\)/,
  "expected pace math to use medians rather than means",
);

assert.match(
  migrationSource,
  /create table if not exists public\.client_error_reports/,
  "expected the migration to create the crash-report table",
);

assert.match(
  migrationSource,
  /with check \(profile_id is null or profile_id = \(select auth\.uid\(\)\)\)/,
  "expected crash reports to be insertable only as the reporting user",
);

assert.doesNotMatch(
  migrationSource,
  /grant select on table public\.client_error_reports/,
  "expected crash reports to stay unreadable through the API",
);

// --- pace screen wiring -----------------------------------------------------
const paceSource = read("app", "pace.tsx");

assert.match(
  paceSource,
  /getPaceScreen\(\{ profileId \}\)/,
  "expected the pace screen to load its payload from the server RPC",
);

assert.match(
  paceSource,
  /useLiveAnalyticsQuery/,
  "expected the pace screen to use the shared live analytics query loop",
);

assert.doesNotMatch(
  paceSource,
  /buildGamePace/,
  "expected the pace route to stay server-authored rather than deriving locally",
);

const loaderSource = read("lib", "cloud", "analytics", "getPaceScreen.ts");
assert.match(
  loaderSource,
  /"get_pace_screen"/,
  "expected the pace loader to call the get_pace_screen RPC",
);

const hubsSource = read("utils", "appHubs.ts");
assert.match(
  hubsSource,
  /route: APP_ROUTES\.pace/,
  "expected the analytics hub to link to the pace screen",
);

// --- crash telemetry wiring -------------------------------------------------
const telemetrySource = read("lib", "telemetry", "errorReporting.ts");

assert.match(
  telemetrySource,
  /from\("client_error_reports"\)\.insert\(/,
  "expected error reports to insert into client_error_reports",
);

assert.match(
  telemetrySource,
  /MAX_REPORTS_PER_SESSION/,
  "expected error reporting to cap reports per session",
);

assert.match(
  telemetrySource,
  /previousHandler\?\.\(error, isFatal\)/,
  "expected the global handler hook to chain to the previous handler",
);

const layoutSource = read("app", "_layout.tsx");
assert.match(
  layoutSource,
  /installErrorReporting\(\)/,
  "expected the root layout to install the global error handler",
);
assert.match(
  layoutSource,
  /<RootErrorBoundary>/,
  "expected the root layout to wrap the app in the error boundary",
);

// --- owner digest loop --------------------------------------------------
const digestMigration = fs
  .readdirSync(migrationDir)
  .filter((file) => file.includes("error_report_digest"))
  .at(-1);

assert.ok(digestMigration, "expected the error-report digest migration to exist");
const digestSource = read("supabase", "migrations", digestMigration);

assert.match(
  digestSource,
  /viewer_email <> 'izzy\.hodnett@gmail\.com'/,
  "expected the digest RPC to be restricted to the app owner",
);

assert.doesNotMatch(
  digestSource,
  /'stack'/,
  "expected the digest to expose messages and counts, never stack traces",
);

const backupScreenSource = read("app", "data-backup.tsx");
assert.match(
  backupScreenSource,
  /supabase\.rpc\("get_error_report_digest"\)/,
  "expected the backup screen to load the owner crash digest",
);
assert.match(
  backupScreenSource,
  /if \(digest\.isOwner\)/,
  "expected the crash digest card to stay hidden for non-owners",
);

console.log("pace-screen-and-error-reports.test.cjs passed");
