const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const screenPath = path.join(projectRoot, "app", "add-players.tsx");
const screenSource = fs.readFileSync(screenPath, "utf8");

assert.doesNotMatch(
  screenSource,
  /state\.addGroup\b/,
  "expected add-players.tsx to stop reading the local addGroup store action",
);

assert.doesNotMatch(
  screenSource,
  /state\.deleteGroup\b|state\.removeGroup\b/,
  "expected add-players.tsx to stop reading the local deleteGroup/removeGroup store actions",
);

assert.doesNotMatch(
  screenSource,
  /addGroup\?\.\(|deleteGroup\?\.\(/,
  "expected add-players.tsx to remove local addGroup/deleteGroup fallback calls",
);

assert.match(
  screenSource,
  /group\.playerIds\.includes\(signedInUserId\)/,
  "expected shared-group delete access to depend on signed-in membership",
);

assert.match(
  screenSource,
  /Only players in this group can delete it\./,
  "expected the membership-gated delete warning copy to remain exact",
);

assert.match(
  screenSource,
  /Log in before managing shared groups\./,
  "expected the login-required shared-group guard copy to remain exact",
);

assert.match(
  screenSource,
  /Finish profile setup before managing shared groups\./,
  "expected the profile-setup shared-group guard copy to remain exact",
);

console.log("shared-groups-member-delete-ui.test.cjs passed");
