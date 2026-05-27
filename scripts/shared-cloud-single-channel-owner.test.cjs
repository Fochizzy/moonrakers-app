const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const layoutSource = read(path.join("app", "_layout.tsx"));
const bootstrapSource = read(path.join("lib", "auth", "useSharedCloudBootstrap.ts"));

assert.doesNotMatch(
  layoutSource,
  /moonrakers-shared-cloud:\$\{authSession\.user\.id\}/,
  "expected app/_layout.tsx to stop owning the shared-cloud realtime subscription",
);

assert.match(
  bootstrapSource,
  /moonrakers-shared-cloud:\$\{sharedCloudUserId\}|const channelName = `moonrakers-shared-cloud:\$\{sharedCloudUserId\}`/,
  "expected useSharedCloudBootstrap to remain the single owner of the shared-cloud realtime channel",
);

assert.match(
  bootstrapSource,
  /\.on\(\s*"postgres_changes"[\s\S]*table: "groups"[\s\S]*\.on\(\s*"postgres_changes"[\s\S]*table: "group_members"[\s\S]*\.subscribe\(\)/,
  "expected useSharedCloudBootstrap to keep the groups and group_members realtime wiring",
);

assert.match(
  bootstrapSource,
  /const existingChannels = supabase[\s\S]*getChannels\(\)[\s\S]*filter\(\(existingChannel\) => existingChannel\.topic === channelTopic\)[\s\S]*for \(const existingChannel of existingChannels\) \{[\s\S]*await supabase\.removeChannel\(existingChannel\);/,
  "expected useSharedCloudBootstrap to evict any cached shared-cloud channel through supabase.removeChannel before re-subscribing",
);

console.log("shared-cloud-single-channel-owner.test.cjs passed");
