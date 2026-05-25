const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const listSource = fs.readFileSync(
  path.join(projectRoot, "components", "InsightList.tsx"),
  "utf8"
);
const cardSource = fs.readFileSync(
  path.join(projectRoot, "components", "InsightCard.tsx"),
  "utf8"
);

assert.match(
  listSource,
  /<View style=\{styles\.header\}>[\s\S]*<View style=\{styles\.titleWrap\}>[\s\S]*<Text style=\{styles\.eyebrow\}>Intelligence<\/Text>[\s\S]*<Text style=\{styles\.title\}>\{title\}<\/Text>[\s\S]*<\/View>[\s\S]*<View style=\{styles\.countCard\}>/,
  "expected InsightList to use a compact title-and-count header row"
);

assert.match(
  listSource,
  /panel:\s*\{[\s\S]*padding:\s*12,[\s\S]*gap:\s*10,/,
  "expected InsightList to trim panel padding and spacing for denser signal browsing"
);

assert.match(
  cardSource,
  /!!playerName && \(\s*<View style=\{styles\.metaRow\}>[\s\S]*<Text style=\{styles\.metaLabel\}>Player<\/Text>[\s\S]*<Text style=\{styles\.player\}>\{playerName\}<\/Text>[\s\S]*<\/View>\s*\)/,
  "expected InsightCard to show the player label inline instead of using a large footer block"
);

assert.match(
  cardSource,
  /card:\s*\{[\s\S]*padding:\s*12,[\s\S]*gap:\s*8,[\s\S]*minHeight:\s*92,/,
  "expected InsightCard to use a tighter compact card layout"
);

console.log("insight-feed-compact-layout.test.cjs passed");
