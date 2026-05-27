const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const historyPath = path.join(projectRoot, "app", "history.tsx");
const routesPath = path.join(projectRoot, "utils", "appRoutes.ts");
const managerPath = path.join(projectRoot, "lib", "history", "useHistoryDataManager.ts");

const historySource = fs.readFileSync(historyPath, "utf8");
const routesSource = fs.readFileSync(routesPath, "utf8");
const managerSource = fs.readFileSync(managerPath, "utf8");

assert.match(
  historySource,
  /useLocalSearchParams<\{\s*gameId\?: string \| string\[\]\s*\}>/,
  "expected the History screen to keep only focused-game params for deep-link snaps",
);

assert.doesNotMatch(
  historySource,
  /Import backup/,
  "expected the History screen to remove the visible import backup CTA",
);

assert.doesNotMatch(
  historySource,
  /importBackupFromPicker\(/,
  "expected the History screen to stop calling the picker-backed import helper",
);

assert.doesNotMatch(
  historySource,
  /params\.intent|toLowerCase\(\) === 'import'|sectionHighlighted|backupCenterNote/,
  "expected the History screen to remove import-intent and backup-center wiring",
);

assert.doesNotMatch(
  routesSource,
  /intent\?: "import" \| null|input\?\.intent/,
  "expected the shared History route builder to stop accepting import intent params",
);

assert.doesNotMatch(
  managerSource,
  /history_import|importBackupFromPicker|importingBackup|importBackup\(/,
  "expected the shared History data manager to drop import-specific state and helpers",
);

console.log("history-import-backup-flow.test.cjs passed");
