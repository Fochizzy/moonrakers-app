const fs = require("fs");
const path = require("path");

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

function assertMatch(source, pattern, label) {
  if (!pattern.test(source)) {
    throw new Error(`Missing ${label}`);
  }
}

function assertNoMatch(source, pattern, label) {
  if (pattern.test(source)) {
    throw new Error(`Unexpected ${label}`);
  }
}

const analyticsSource = read(path.join("app", "analytics.tsx"));
const appHubsSource = read(path.join("utils", "appHubs.ts"));

assertMatch(
  analyticsSource,
  /APP_ICONS/,
  "APP_ICONS usage on the analytics hub cards"
);

assertMatch(
  analyticsSource,
  /function CroppedHubIcon\(/,
  "cropped analytics poster helper"
);

assertMatch(
  appHubsSource,
  /key:\s*"compare"[\s\S]*?iconKey:\s*"damage"/,
  "compare card damage artwork swap"
);

assertMatch(
  appHubsSource,
  /key:\s*"charts"[\s\S]*?iconKey:\s*"ships"/,
  "charts card ships artwork swap"
);

assertMatch(
  appHubsSource,
  /key:\s*"stats"[\s\S]*?iconKey:\s*"shield"/,
  "stats card shield artwork swap"
);

assertMatch(
  appHubsSource,
  /key:\s*"elo"[\s\S]*?iconKey:\s*"reactor"/,
  "elo card reactor artwork swap"
);

assertMatch(
  appHubsSource,
  /key:\s*"insights"[\s\S]*?iconKey:\s*"thruster"/,
  "insights card thruster artwork swap"
);

assertMatch(
  appHubsSource,
  /key:\s*"directory"[\s\S]*?iconKey:\s*"billBendo"/,
  "profiles card Bill_Bendo artwork swap"
);

console.log("analytics-hub-preview.test.cjs passed");
