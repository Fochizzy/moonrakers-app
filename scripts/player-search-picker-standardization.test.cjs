const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const pickerSource = read(path.join("components", "players", "PlayerSearchPicker.tsx"));
const railSource = read(path.join("components", "analytics", "AnalyticsControlRail.tsx"));

assert.match(
  pickerSource,
  /autoCapitalize\?: "none" \| "words" \| "sentences" \| "characters"/,
  "expected PlayerSearchPicker to expose a configurable autoCapitalize prop",
);

assert.match(
  pickerSource,
  /clearLabel\?: string;/,
  "expected PlayerSearchPicker to expose an optional clear label prop",
);

assert.match(
  pickerSource,
  /onClearQuery\?: \(\) => void;/,
  "expected PlayerSearchPicker to expose an optional clear-query handler",
);

assert.match(
  pickerSource,
  /inputProps\?: PlayerSearchPickerInputProps;/,
  "expected PlayerSearchPicker to expose shared text-input prop pass-through",
);

assert.match(
  pickerSource,
  /autoCapitalize=\{autoCapitalize\}/,
  "expected PlayerSearchPicker to use the configurable autoCapitalize prop",
);

assert.match(
  pickerSource,
  /query\.trim\(\)\.length > 0 && onClearQuery/,
  "expected PlayerSearchPicker to render a shared clear affordance when the query is non-empty",
);

assert.match(
  pickerSource,
  /<Text style=\{styles\.clearButtonText\}>\{clearLabel\}<\/Text>/,
  "expected PlayerSearchPicker to render the shared clear label",
);

assert.match(
  railSource,
  /autoCapitalize=\{search\.autoCapitalize \?\? "words"\}/,
  "expected AnalyticsControlRail to pass autoCapitalize through to the shared picker",
);

assert.match(
  railSource,
  /clearLabel=\{search\.clearLabel\}/,
  "expected AnalyticsControlRail to pass the shared clear label through to PlayerSearchPicker",
);

assert.match(
  railSource,
  /inputProps=\{search\.inputProps\}/,
  "expected AnalyticsControlRail to pass shared text-input props through to PlayerSearchPicker",
);

assert.match(
  railSource,
  /onClearQuery=\{search\.onClearQuery\}/,
  "expected AnalyticsControlRail to pass the shared clear-query handler through to PlayerSearchPicker",
);

console.log("player-search-picker-standardization.test.cjs passed");
