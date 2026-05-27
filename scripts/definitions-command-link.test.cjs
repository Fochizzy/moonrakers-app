const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const definitionsSource = fs.readFileSync(
  path.join(projectRoot, "app", "definitions.tsx"),
  "utf8"
);
const sectionCardSource = fs.readFileSync(
  path.join(projectRoot, "components", "ui", "SectionCard.tsx"),
  "utf8"
);

assert.match(
  definitionsSource,
  /from "@\/utils\/appRoutes"/,
  "expected the Definitions screen to import shared app route helpers for Command navigation"
);

assert.match(
  definitionsSource,
  /const router = useRouter\(\);/,
  "expected the Definitions screen to create a router instance for Command navigation"
);

assert.match(
  definitionsSource,
  /<SectionCard[\s\S]*actions=\{[\s\S]*router\.push\(APP_ROUTES\.home\)[\s\S]*Command[\s\S]*\}/,
  "expected the Definitions hero card to render a top-right Command action"
);

assert.match(
  sectionCardSource,
  /actions\?: React\.ReactNode;/,
  "expected SectionCard to support header actions for compact screens like Definitions"
);

console.log("definitions-command-link.test.cjs passed");
