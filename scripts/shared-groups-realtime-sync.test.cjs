const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const layoutSource = read(path.join("app", "_layout.tsx"));
const migrationSource = read(
  path.join(
    "supabase",
    "migrations",
    "20260523044601_moonrakers_groups_realtime_publication.sql",
  ),
);

assert.match(
  layoutSource,
  /async function loadHydratedSharedSnapshot\(session: AuthSession\)/,
  "expected _layout.tsx to centralize signed-in shared snapshot hydration for live refreshes",
);

assert.match(
  layoutSource,
  /\.channel\(`moonrakers-shared-cloud:\$\{authSession\.user\.id\}`\)/,
  "expected _layout.tsx to subscribe signed-in clients to shared cloud changes",
);

assert.match(
  layoutSource,
  /table: "groups"/,
  "expected _layout.tsx to watch group rows for shared refreshes",
);

assert.match(
  layoutSource,
  /table: "group_members"/,
  "expected _layout.tsx to watch group membership rows for shared refreshes",
);

assert.match(
  migrationSource,
  /alter publication supabase_realtime add table public\.groups;/,
  "expected the realtime publication migration to publish groups",
);

assert.match(
  migrationSource,
  /alter publication supabase_realtime add table public\.group_members;/,
  "expected the realtime publication migration to publish group_members",
);

console.log("shared-groups-realtime-sync.test.cjs passed");
