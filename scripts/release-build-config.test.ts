import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const appConfigPath = path.join(projectRoot, "app.config.js");

const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const originalKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

delete process.env.EXPO_PUBLIC_SUPABASE_URL;
delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
delete require.cache[require.resolve(appConfigPath)];

const appConfig = require(appConfigPath);
const expoConfig = appConfig?.expo ?? {};

assert.equal(
  expoConfig.icon,
  "./assets/icon.png",
  "release config should keep the launcher icon wired when local env files are unavailable",
);
assert.equal(
  expoConfig.android?.adaptiveIcon?.foregroundImage,
  "./assets/icon.png",
  "release config should keep the adaptive icon wired when local env files are unavailable",
);
assert.equal(
  expoConfig.extra?.EXPO_PUBLIC_SUPABASE_URL,
  "https://znpzawotdmkcdjpwjkds.supabase.co",
  "release config should provide the public Supabase URL without relying on .env.local",
);
assert.equal(
  expoConfig.extra?.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  "sb_publishable_U657t2wc1r6ParKopa6F8A_mp0VZFxW",
  "release config should provide the public Supabase publishable key without relying on .env.local",
);

if (originalUrl === undefined) {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
} else {
  process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
}

if (originalKey === undefined) {
  delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
} else {
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
}

delete require.cache[require.resolve(appConfigPath)];

console.log("release-build-config.test.ts passed");
