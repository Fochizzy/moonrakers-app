const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const backupPath = path.join(projectRoot, "utils", "backup.ts");
const helperPath = path.join(projectRoot, "lib", "migration", "importBackupFromPicker.ts");
const historyPath = path.join(projectRoot, "app", "history.tsx");

const backupSource = fs.readFileSync(backupPath, "utf8");
const helperSource = fs.readFileSync(helperPath, "utf8");
const historySource = fs.readFileSync(historyPath, "utf8");

assert.match(
  backupSource,
  /export function parseBackupPayload\(data: unknown\)(?::\s*BackupPayload)?\s*\{\s*return sanitizeBackupPayload\(data\);\s*\}/s,
  "expected the backup utility to export a reusable payload parser",
);

assert.match(
  helperSource,
  /import \* as DocumentPicker from "expo-document-picker";/,
  "expected the History import helper to use the document picker",
);

assert.match(
  helperSource,
  /parseBackupPayload\(JSON\.parse\(raw\)\)/,
  "expected the History import helper to sanitize parsed backup JSON",
);

assert.match(
  helperSource,
  /buildLegacyMigrationPayload\(/,
  "expected the History import helper to build a legacy migration payload",
);

assert.match(
  helperSource,
  /importLegacyPayload\(/,
  "expected the History import helper to hand the payload to the Supabase importer",
);

assert.match(
  historySource,
  /useLocalSearchParams/,
  "expected the History screen to read route intent params",
);

assert.match(
  historySource,
  /Import backup/,
  "expected the History screen to surface an Import backup CTA",
);

assert.match(
  historySource,
  /importBackupFromPicker\(/,
  "expected the History screen to call the picker-backed import helper",
);

assert.match(
  historySource,
  /toLowerCase\(\) === 'import'/,
  "expected the History screen to support the import route intent",
);

console.log("history-import-backup-flow.test.cjs passed");
