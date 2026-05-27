const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const loginSource = fs.readFileSync(
  path.join(projectRoot, "app", "login.tsx"),
  "utf8",
);

if (!loginSource.includes('const APP_ICON = require("@/assets/icon.png");')) {
  throw new Error("Expected login screen to use the app icon asset.");
}

if (!loginSource.includes("<Image source={APP_ICON}")) {
  throw new Error("Expected login screen to render the app icon above the auth card.");
}

if (!loginSource.includes("styles.brandIcon")) {
  throw new Error("Expected login screen to include a dedicated brand icon style.");
}

console.log("login-brand-icon.test.cjs passed");
