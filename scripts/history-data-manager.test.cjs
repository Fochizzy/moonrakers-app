const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const historySource = fs.readFileSync(
  path.join(projectRoot, "app", "history.tsx"),
  "utf8",
);

assert.match(
  historySource,
  /lib\/history\/useHistoryDataManager/,
  "expected app/history.tsx to delegate import, delete, and refresh orchestration to the shared history data manager",
);

assert.doesNotMatch(
  historySource,
  /async function refreshCloudHistoryState/,
  "expected app/history.tsx to stop defining the cloud refresh orchestration inline",
);

assert.doesNotMatch(
  historySource,
  /async function handleImportBackup/,
  "expected app/history.tsx to stop defining backup-import orchestration inline",
);

console.log("history-data-manager.test.cjs passed");
