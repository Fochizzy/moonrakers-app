const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(projectRoot, "app", "analytics.tsx"), "utf8");

assert.match(
  source,
  /<AnalyticsStateSection[\s\S]*title="Analytics Destinations"[\s\S]*style=\{styles\.directorySection\}/,
  "expected the analytics destinations section to use a tighter route-specific section style",
);

assert.match(
  source,
  /directorySection:\s*\{[\s\S]*padding:\s*14,[\s\S]*gap:\s*10,/s,
  "expected the analytics destinations section to trim its padding and internal gap after removing the source badge pill",
);

assert.match(
  source,
  /<Text style=\{\[styles\.cardTitle, styles\.cardTitleWide\]\}>\{card\.title\}<\/Text>/,
  "expected the wide analytics cards to render plain titles so glossary term styling does not underline ELO",
);

assert.match(
  source,
  /<Text style=\{styles\.cardTitle\}>\{card\.title\}<\/Text>/,
  "expected the standard analytics cards to render plain titles so ELO matches the other labels",
);

assert.doesNotMatch(
  source,
  /<DefinitionRichText text=\{card\.title\}/,
  "expected analytics card titles to stop routing through glossary-rich text styling",
);

assert.match(
  source,
  /iconShell:\s*\{[\s\S]*width:\s*116,[\s\S]*height:\s*96,/s,
  "expected the analytics hub icon shell to shrink slightly",
);

assert.match(
  source,
  /iconPreviewFrame:\s*\{[\s\S]*width:\s*84,[\s\S]*height:\s*84,/s,
  "expected the analytics hub preview frame to shrink with the shell",
);

assert.match(
  source,
  /iconImage:\s*\{[\s\S]*width:\s*72,[\s\S]*height:\s*72,/s,
  "expected the analytics hub image art to scale down a touch too",
);

assert.match(
  source,
  /card:\s*\{[\s\S]*shadowOpacity:\s*0\.08,[\s\S]*shadowRadius:\s*14,[\s\S]*elevation:\s*3,/s,
  "expected the analytics hub cards to lower the outer glow weight slightly",
);

assert.match(
  source,
  /cardBody:\s*\{[\s\S]*minHeight:\s*52,[\s\S]*justifyContent:\s*"flex-end",/s,
  "expected the standard analytics cards to reserve a consistent bottom text block height",
);

assert.match(
  source,
  /cardWideContent:\s*\{[\s\S]*justifyContent:\s*"flex-end",/s,
  "expected the wide analytics card to anchor its content to the same lower region as the standard cards",
);

assert.match(
  source,
  /cardWideTitleWrap:\s*\{[\s\S]*minHeight:\s*52,[\s\S]*justifyContent:\s*"flex-end",[\s\S]*alignItems:\s*"center",/s,
  "expected the wide analytics card title block to use the same bottom-zone height as the standard cards",
);

console.log("analytics-hub-polish.test.cjs passed");
