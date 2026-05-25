const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const routePath = path.join(__dirname, "..", "app", "manage-players-groups.tsx");
const source = fs.readFileSync(routePath, "utf8");

assert.ok(
  source.includes("Redirect"),
  "Expected app/manage-players-groups.tsx to render a Redirect"
);

assert.ok(
  source.includes("APP_ROUTES.roster"),
  "Expected app/manage-players-groups.tsx to target APP_ROUTES.roster"
);

for (const legacySurface of ["addGroup", "removeGroup", "addPlayer", "removePlayer"]) {
  assert.equal(
    source.includes(legacySurface),
    false,
    `Expected app/manage-players-groups.tsx to retire ${legacySurface}`
  );
}

console.log("manage-players-groups-no-local-route.test.cjs passed");
