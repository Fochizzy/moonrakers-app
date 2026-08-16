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
  /key:\s*"compare"[\s\S]*?iconKey:\s*"compare"/,
  "compare card semantic icon mapping"
);

assertMatch(
  appHubsSource,
  /key:\s*"charts"[\s\S]*?iconKey:\s*"charts"/,
  "charts card semantic icon mapping"
);

assertMatch(
  appHubsSource,
  /key:\s*"stats"[\s\S]*?iconKey:\s*"statistics"/,
  "stats card semantic icon mapping"
);

assertMatch(
  appHubsSource,
  /key:\s*"elo"[\s\S]*?iconKey:\s*"elo"/,
  "elo card semantic icon mapping"
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
