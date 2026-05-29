const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const telemetrySource = read(path.join("components", "charts", "compare", "CompareTelemetryRow.tsx"));
const stylesSource = read(path.join("utils", "compareStyles.ts"));

assert.doesNotMatch(
  telemetrySource,
  /<Text style=\{styles\.telemetryHeadline\} numberOfLines=\{1\}>/,
  "expected compare telemetry to stop forcing the headline into a single clipped line",
);

assert.match(
  telemetrySource,
  /<Text style=\{styles\.telemetryHeadline\}>\s*\{headline\}\s*<\/Text>/,
  "expected compare telemetry to render the trend summary as its own readable headline line",
);

assert.match(
  telemetrySource,
  /<Text style=\{styles\.telemetryMeta\}>\s*Turn \{formatCorrelation\(n\(safeInsight\.correlation\)\)\} - \{sampleCount\} sample\s*\{sampleCount === 1 \? '' : 's'\}\s*<\/Text>/,
  "expected compare telemetry to move turn correlation and sample count onto a dedicated metadata line",
);

assert.match(
  stylesSource,
  /telemetryCardWide:\s*\{[\s\S]*paddingHorizontal:\s*16[\s\S]*paddingVertical:\s*14[\s\S]*borderRadius:\s*18[\s\S]*\}/,
  "expected compare telemetry to define a dedicated card style so the wrapped copy still reads like a finished surface",
);

assert.match(
  stylesSource,
  /telemetryHeadline:\s*\{[\s\S]*fontSize:\s*18[\s\S]*lineHeight:\s*24[\s\S]*fontWeight:\s*'800'[\s\S]*\}/,
  "expected compare telemetry to define a multiline headline style sized for narrow phone screens",
);

assert.match(
  stylesSource,
  /telemetryMeta:\s*\{[\s\S]*fontSize:\s*12[\s\S]*lineHeight:\s*18[\s\S]*\}/,
  "expected compare telemetry to define a secondary metadata style for turn correlation and sample count",
);

console.log("compare-telemetry-layout.test.cjs passed");
