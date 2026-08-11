const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "lib", "supabase.ts"),
  "utf8",
);

assert.match(
  source,
  /process\.env\.EXPO_PUBLIC_SUPABASE_URL/,
  "expected the web Supabase config path to read EXPO_PUBLIC_SUPABASE_URL directly from process.env so Expo can inline it during export",
);

assert.match(
  source,
  /process\.env\.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
  "expected the web Supabase config path to read EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY directly from process.env so Expo can inline it during export",
);

console.log("supabase-web-env-inline.test.cjs passed");
