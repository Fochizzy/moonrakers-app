// The credit line and the "unofficial fan tool" notice have to read the same on
// the site and in the app, but Metro and Next each inline their own
// `*_PUBLIC_` env vars, so the two copies cannot share a module. This guard is
// what keeps them from drifting apart, and what keeps the footer mounted on
// every shell it was added to.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(projectRoot, ...parts), "utf8");
}

/** Pulls `export const NAME = "..."` (single- or double-quoted) out of a module. */
function readExportedString(source, name, label) {
  const match = source.match(
    new RegExp(`export const ${name} =\\s*["']([^"']+)["']`),
  );
  assert.ok(match, `expected ${label} to export ${name} as a string literal`);
  return match[1];
}

const nativeCredits = read("utils", "siteCredits.ts");
const webCredits = read("apps", "dashboard", "src", "lib", "siteCredits.ts");

assert.equal(
  readExportedString(nativeCredits, "CREDIT_LINE_PREFIX", "utils/siteCredits.ts"),
  "Built by Izzy Hodnett with Claude",
  "expected the app's credit line to name the author and Claude",
);
assert.equal(
  readExportedString(
    webCredits,
    "CREDIT_LINE_PREFIX",
    "apps/dashboard/src/lib/siteCredits.ts",
  ),
  readExportedString(nativeCredits, "CREDIT_LINE_PREFIX", "utils/siteCredits.ts"),
  "expected the site and the app to print the same credit line",
);

assert.equal(
  readExportedString(
    nativeCredits,
    "AFFILIATION_DISCLAIMER",
    "utils/siteCredits.ts",
  ),
  "Unofficial fan tool. Not affiliated with IV Studio.",
  "expected the app to disclaim any affiliation with IV Studio",
);
assert.equal(
  readExportedString(
    webCredits,
    "AFFILIATION_DISCLAIMER",
    "apps/dashboard/src/lib/siteCredits.ts",
  ),
  readExportedString(
    nativeCredits,
    "AFFILIATION_DISCLAIMER",
    "utils/siteCredits.ts",
  ),
  "expected the site and the app to carry the same disclaimer",
);

// A destination that does not exist yet must not ship as a dead link, so both
// modules gate the href on a configured, non-blank URL.
for (const [label, source, prefix] of [
  ["utils/siteCredits.ts", nativeCredits, "EXPO_PUBLIC"],
  ["apps/dashboard/src/lib/siteCredits.ts", webCredits, "NEXT_PUBLIC"],
]) {
  assert.match(
    source,
    new RegExp(`process\\.env\\.${prefix}_ABOUT_URL`),
    `expected ${label} to read the About URL from ${prefix}_ABOUT_URL`,
  );
  assert.match(
    source,
    new RegExp(`process\\.env\\.${prefix}_PORTFOLIO_URL`),
    `expected ${label} to read the Portfolio URL from ${prefix}_PORTFOLIO_URL`,
  );
  assert.match(
    source,
    /trimmed\.length > 0 \? trimmed : null/,
    `expected ${label} to treat a blank URL as unconfigured`,
  );
}

// --------------------------------------------------------------- website ---

const footer = read(
  "apps",
  "dashboard",
  "src",
  "components",
  "layout",
  "SiteFooter.tsx",
);
assert.match(
  footer,
  /rel="noreferrer"[\s\S]*target="_blank"/,
  "expected the site footer to open its outbound links safely in a new tab",
);
assert.match(
  footer,
  /<p className="site-footer__note">\{AFFILIATION_DISCLAIMER\}<\/p>/,
  "expected the site footer to print the disclaimer under the credit line",
);

// Every shell renders the footer itself, so a new shell that forgets it is the
// failure this list is here to catch.
const FOOTER_SHELLS = [
  ["apps", "dashboard", "src", "app", "(dashboard)", "layout.tsx"],
  ["apps", "dashboard", "src", "app", "auth", "page.tsx"],
  ["apps", "dashboard", "src", "app", "onboarding", "page.tsx"],
  ["apps", "dashboard", "src", "components", "preview", "PreviewView.tsx"],
];

for (const shell of FOOTER_SHELLS) {
  const source = read(...shell);
  const label = shell.join("/");

  assert.match(
    source,
    /import \{ SiteFooter \} from "@\/components\/layout\/SiteFooter";/,
    `expected ${label} to import the shared site footer`,
  );
  assert.match(
    source,
    /<SiteFooter \/>/,
    `expected ${label} to render the shared site footer`,
  );
}

const globals = read("apps", "dashboard", "src", "app", "globals.css");
assert.match(
  globals,
  /\.site-footer \{/,
  "expected globals.css to style the site footer",
);
assert.match(
  globals,
  /\.centered-shell \{[\s\S]*grid-template-rows: minmax\(0, 1fr\) auto;/,
  "expected the centred shells to give the footer its own bottom row",
);

// ------------------------------------------------------------------- app ---

const modal = read("components", "support", "AboutCreditsModal.tsx");
assert.match(
  modal,
  /accessibilityRole="link"/,
  "expected the credits modal to expose its outbound links as links",
);
assert.match(
  modal,
  /\{AFFILIATION_DISCLAIMER\}/,
  "expected the credits modal to print the affiliation disclaimer",
);
assert.match(
  modal,
  /Linking\.openURL/,
  "expected the credits modal to open a configured URL in the browser",
);

const home = read("app", "index.tsx");
assert.match(
  home,
  /import AboutCreditsModal from "@\/components\/support\/AboutCreditsModal";/,
  "expected the Command page to import the credits modal",
);
assert.match(
  home,
  /<Text style=\{styles\.creditsLinkText\}>\{CREDIT_LINE_PREFIX\}<\/Text>/,
  "expected the Command page link to carry the shared credit line",
);
assert.match(
  home,
  /onPress=\{\(\) => setCreditsOpen\(true\)\}/,
  "expected the Command page link to open the credits modal",
);
assert.match(
  home,
  /<AboutCreditsModal[\s\S]*visible=\{creditsOpen\}/,
  "expected the Command page to mount the credits modal",
);

// "Very small" is the whole point of the link — a bump back up to control size
// would make it compete with Report a bug.
const creditsLinkText = home.match(
  /creditsLinkText: \{[\s\S]*?\n {2}\},/,
);
assert.ok(creditsLinkText, "expected the Command page to style the credits link");
assert.match(
  creditsLinkText[0],
  /fontSize: 10,/,
  "expected the credits link to stay at the smallest type size on the page",
);

console.log("site-credits-footer.test.cjs passed");
