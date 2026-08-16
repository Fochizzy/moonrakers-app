const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(projectRoot, ...parts), "utf8");
}

function migration(fragment) {
  const dir = path.join(projectRoot, "supabase", "migrations");
  const file = fs
    .readdirSync(dir)
    .filter((name) => name.includes(fragment))
    .at(-1);

  assert.ok(file, `expected a migration matching "${fragment}"`);
  return fs.readFileSync(path.join(dir, file), "utf8");
}

// --- beta access requests ---------------------------------------------------

const betaMigration = migration("beta_access_requests");

assert.match(
  betaMigration,
  /create table if not exists public\.beta_access_requests/,
  "expected the beta access request table",
);

assert.match(
  betaMigration,
  /for insert\s+to anon, authenticated/,
  "expected the public form to be able to insert without a session",
);

assert.doesNotMatch(
  betaMigration,
  /for select\s+to anon/,
  "anon must never be able to read the signup list back",
);

assert.match(
  betaMigration,
  /create unique index if not exists beta_access_requests_email_key\s+on public\.beta_access_requests \(lower\(email\)\)/,
  "expected a case-insensitive unique index so one person cannot enrol twice",
);

// --- admin console gate -----------------------------------------------------

const adminMigration = migration("beta_access_admin");

assert.match(
  adminMigration,
  /create table if not exists private\.beta_admins/,
  "expected the admin allowlist to live in the private schema",
);

assert.match(
  adminMigration,
  /for select\s+to authenticated\s+using \(private\.is_beta_admin\(\)\)/,
  "expected the signup list to be readable only by a beta admin",
);

// --- bug reports ------------------------------------------------------------

const bugMigration = migration("bug_reports");

assert.match(
  bugMigration,
  /create table if not exists public\.bug_reports/,
  "expected the bug report table",
);

assert.match(
  bugMigration,
  /with check \(profile_id = auth\.uid\(\)\)/,
  "a reporter must only be able to file a report as themselves",
);

assert.match(
  bugMigration,
  /using \(private\.is_beta_admin\(\)\)/,
  "reports must only be readable by the beta admin",
);

assert.match(
  bugMigration,
  /create trigger bug_reports_notify\s+after insert on public\.bug_reports/,
  "expected the email to be sent from a trigger, not from the phone",
);

assert.match(
  bugMigration,
  /private\.html_escape\(new\.description\)/,
  "a report's text lands in HTML email and must be escaped",
);

assert.match(
  bugMigration,
  /private\.html_escape\(new\.reporter_name\)/,
  "a reporter's name lands in HTML email and must be escaped",
);

// --- app wiring -------------------------------------------------------------

const submitSource = read("lib", "support", "submitBugReport.ts");

assert.match(
  submitSource,
  /from\('bug_reports'\)/,
  "expected the app to insert into bug_reports",
);

assert.match(
  submitSource,
  /if \(!draft\.profileId\)/,
  "expected a signed-out report to be refused before it reaches RLS",
);

const commandSource = read("app", "index.tsx");

assert.match(
  commandSource,
  /BugReportModal/,
  "expected the command page to mount the bug report modal",
);

assert.match(
  commandSource,
  /title="Report a bug"/,
  "expected a Report a bug button on the command page",
);

assert.ok(
  commandSource.indexOf("bugReportFooter") >
    commandSource.indexOf('tab === "hubs"'),
  "expected the bug report button to sit below the tab panels",
);

// --- emails keep the app's look --------------------------------------------

const emailSource = read(
  "apps",
  "dashboard",
  "src",
  "lib",
  "beta",
  "betaEmails.ts",
);

assert.doesNotMatch(
  emailSource,
  /var\(--/,
  "mail clients do not resolve CSS variables, so the palette must be literal",
);

assert.match(
  emailSource,
  /play\.google\.com\/store\/apps\/details\?id=com\.fochizzy\.moonrakers/,
  "expected the invite to carry the Play Store link",
);

console.log("bug-report-and-beta-access.test.cjs passed");
