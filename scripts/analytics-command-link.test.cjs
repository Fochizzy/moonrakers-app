const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const analyticsSource = fs.readFileSync(
  path.join(projectRoot, "app", "analytics.tsx"),
  "utf8"
);
const heroCardSource = fs.readFileSync(
  path.join(projectRoot, "components", "ui", "HeroCard.tsx"),
  "utf8"
);

assert.match(
  analyticsSource,
  /from "@\/utils\/appRoutes"/,
  "expected the analytics hub to import the shared app route helpers for Command navigation"
);

assert.match(
  analyticsSource,
  /<HeroCard[\s\S]*headerAction=\{[\s\S]*router\.push\(buildHomeRoute\(\)\)[\s\S]*Command[\s\S]*\}/,
  "expected the analytics hero to pass a top-right Command action into the shared hero card"
);

assert.match(
  heroCardSource,
  /headerAction\?: React\.ReactNode;/,
  "expected HeroCard to accept an optional header action slot"
);

assert.match(
  heroCardSource,
  /<View style=\{styles\.headerRow\}>[\s\S]*<View style=\{styles\.headerCopy\}>[\s\S]*<DefinitionRichText text=\{title\} variant="pageTitle" \/>[\s\S]*<View style=\{styles\.headerAction\}>\{headerAction\}<\/View>/,
  "expected HeroCard to render the title block and optional header action in a shared top row"
);

console.log("analytics-command-link.test.cjs passed");
