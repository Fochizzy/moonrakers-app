const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(projectRoot, ...parts), "utf8");
}

const compareRouteSource = read("app", "charts", "compare", "index.tsx");
const heroCardSource = read("components", "ui", "HeroCard.tsx");
const conditionalCardSource = read(
  "components",
  "charts",
  "compare",
  "ConditionalComparisonCard.tsx"
);

assert.match(
  compareRouteSource,
  /subtitleNumberOfLines=\{activeTab === "conditional" \? 1 : undefined\}/,
  "expected the compare hero subtitle to clamp to one line on the conditional tab"
);

assert.match(
  compareRouteSource,
  /subtitleStyle=\{activeTab === "conditional" \? styles\.heroSubtitleSingleLine : undefined\}/,
  "expected the compare hero subtitle to use the compact single-line style on the conditional tab"
);

assert.doesNotMatch(
  compareRouteSource,
  /\{activeTab === "conditional" \? "Conditional Affect" : "Cohesion Affect"\}/,
  "expected the conditional setup header to stop rendering the truncated Conditional Affect title"
);

assert.doesNotMatch(
  compareRouteSource,
  /title="Conditional Affect"/,
  "expected the conditional builder card to stop passing the duplicate Conditional Affect eyebrow"
);

assert.match(
  compareRouteSource,
  /<Text numberOfLines=\{1\} style=\{\[styles\.sectionSub, styles\.sectionSubFullWidth\]\}>\s*\{liveSentenceSubtitle\}\s*<\/Text>/,
  "expected the conditional setup helper line to span the row and stay on one line"
);

assert.match(
  compareRouteSource,
  /<Text numberOfLines=\{1\} style=\{styles\.sectionTitle\}>\s*Conditional Builder\s*<\/Text>/,
  "expected the conditional builder title to clamp to one line"
);

assert.doesNotMatch(
  compareRouteSource,
  /Keep the sentence structure and live build behavior/,
  "expected the conditional builder helper copy to stay removed"
);

assert.match(
  heroCardSource,
  /subtitleNumberOfLines\?: number;/,
  "expected HeroCard to expose a subtitle line-clamp prop"
);

assert.match(
  heroCardSource,
  /subtitleStyle\?: StyleProp<TextStyle>;/,
  "expected HeroCard to expose a subtitle style override for route-specific tightening"
);

assert.match(
  heroCardSource,
  /<Text[\s\S]*variant="heroSubtitle"[\s\S]*numberOfLines=\{subtitleNumberOfLines\}[\s\S]*style=\{subtitleStyle\}[\s\S]*>\s*\{subtitle\}\s*<\/Text>/,
  "expected HeroCard to forward subtitle line-clamp and style overrides to the subtitle text"
);

assert.match(
  conditionalCardSource,
  /\{title \? <Text style=\{styles\.eyebrow\}>\{title\}<\/Text> : null\}/,
  "expected the conditional builder eyebrow to render only when explicit title copy is provided"
);

console.log("compare-conditional-copy-tightening.test.cjs passed");
