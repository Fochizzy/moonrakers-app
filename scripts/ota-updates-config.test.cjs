const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(...parts) {
  return fs.readFileSync(path.join(projectRoot, ...parts), "utf8");
}

// OTA updates let JS-only fixes reach installed builds without a store release.
// Losing any leg of this wiring silently reverts the app to store-only shipping.

const appConfig = read("app.config.js");

assert.match(
  appConfig,
  /updates:\s*\{\s*url:\s*'https:\/\/u\.expo\.dev\/2393165c-d58c-4414-8f95-c09d72a274cc'/,
  "expected the app config to point at the EAS Update service",
);

assert.match(
  appConfig,
  /runtimeVersion:\s*\{\s*policy:\s*'appVersion'/,
  "expected the appVersion runtime policy so updates never land on an incompatible binary",
);

const easJson = JSON.parse(read("eas.json"));

assert.equal(
  easJson.build?.production?.channel,
  "production",
  "expected the production build profile to subscribe to the production update channel",
);

assert.equal(
  easJson.build?.preview?.channel,
  "preview",
  "expected the preview build profile to have its own update channel",
);

const pkg = JSON.parse(read("package.json"));

assert.ok(
  pkg.dependencies?.["expo-updates"],
  "expected expo-updates to be installed",
);

assert.match(
  pkg.scripts?.["update:production"] ?? "",
  /eas update --channel production --environment production --non-interactive/,
  "expected a one-command production OTA publish path",
);

assert.match(
  pkg.scripts?.["release:android"] ?? "",
  /eas build[^\n]*--auto-submit-with-profile production[^\n]*--non-interactive/,
  "expected the Android release command to submit its finished build without prompts",
);

console.log("ota-updates-config.test.cjs passed");
