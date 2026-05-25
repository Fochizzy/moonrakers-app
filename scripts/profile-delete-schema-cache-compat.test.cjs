const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const compatSource = read(path.join("lib", "cloud", "profileSoftDeleteCompat.ts"));
const registerSource = read(path.join("app", "register.tsx"));
const addPlayersSource = read(path.join("app", "add-players.tsx"));

assert.match(
  compatSource,
  /message\.includes\("deleted_at"\)[\s\S]*message\.includes\("schema cache"\)/,
  "expected deleted_at compatibility detection to treat schema-cache column errors as a fallback trigger",
);

assert.match(
  compatSource,
  /message\.includes\("deleted_at"\)[\s\S]*message\.includes\("does not exist"\)/,
  "expected deleted_at compatibility detection to keep handling direct missing-column errors too",
);

assert.match(
  registerSource,
  /if \(isDeletedAtColumnMissingError\(error\)\) \{/,
  "expected register profile save to retry without deleted_at when the compat helper flags the schema mismatch",
);

assert.match(
  addPlayersSource,
  /if \(isDeletedAtColumnMissingError\(error\)\) \{/,
  "expected add-players profile save to retry without deleted_at when the compat helper flags the schema mismatch",
);

console.log("profile-delete-schema-cache-compat.test.cjs passed");
