const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "history.tsx"),
  "utf8"
);

assert.match(
  source,
  /function HistoryTab\(/,
  "expected history to define a shared underline tab helper"
);

assert.match(
  source,
  /<HistoryTab[\s\S]*label="All"[\s\S]*<HistoryTab[\s\S]*label="Groups"[\s\S]*<HistoryTab[\s\S]*label="Include Me"/,
  "expected the history filter rail to use underline HistoryTab controls for All, Groups, and Include Me"
);

assert.match(
  source,
  /<HistoryTab[\s\S]*label="Newest"[\s\S]*<HistoryTab[\s\S]*label="Oldest"[\s\S]*<HistoryTab[\s\S]*label="Winner"[\s\S]*<HistoryTab[\s\S]*label="Most Rounds"/,
  "expected the history sort rail to use underline HistoryTab controls for Newest, Oldest, Winner, and Most Rounds"
);

assert.doesNotMatch(
  source,
  /primaryFilterPill/,
  "expected the old history pill styles to be removed"
);

console.log("history-underline-tabs.test.cjs passed");
