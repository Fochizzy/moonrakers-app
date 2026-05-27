const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const layoutSource = read(path.join("app", "_layout.tsx"));
const bootstrapSource = read(path.join("lib", "auth", "useSharedCloudBootstrap.ts"));
const migrationSource = read(
  path.join(
    "supabase",
    "migrations",
    "20260523044601_moonrakers_groups_realtime_publication.sql",
  ),
);

assert.doesNotMatch(
  layoutSource,
  /moonrakers-shared-cloud:\$\{/,
  "expected _layout.tsx to delegate shared-cloud realtime wiring to useSharedCloudBootstrap",
);

assert.match(
  bootstrapSource,
  /const channelName = `moonrakers-shared-cloud:\$\{sharedCloudUserId\}`/,
  "expected useSharedCloudBootstrap to own the shared-cloud realtime channel name",
);

assert.match(
  bootstrapSource,
  /table: "groups"/,
  "expected useSharedCloudBootstrap to watch group rows for shared refreshes",
);

assert.match(
  bootstrapSource,
  /table: "group_members"/,
  "expected useSharedCloudBootstrap to watch group membership rows for shared refreshes",
);

assert.match(
  bootstrapSource,
  /getChannels\(\)\s*\.filter\(\(existingChannel\) => existingChannel\.topic === channelTopic\)/,
  "expected useSharedCloudBootstrap to evict cached shared-cloud channels before subscribing again",
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
