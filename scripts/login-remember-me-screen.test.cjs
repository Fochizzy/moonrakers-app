const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const loginSource = fs.readFileSync(
  path.join(projectRoot, "app", "login.tsx"),
  "utf8",
);

function expectIncludes(needle, label) {
  if (!loginSource.includes(needle)) {
    throw new Error(`Expected login screen to include ${label}.`);
  }
}

expectIncludes("Remember me", "remember me copy");
expectIncludes("readRememberedLogin", "remembered login hydration");
expectIncludes("writeRememberedLogin", "remembered login save");
expectIncludes("clearRememberedLogin", "remembered login clear");

console.log("login-remember-me-screen.test.cjs passed");
