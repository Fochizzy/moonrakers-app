const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const bootstrapSource = fs.readFileSync(
  path.join(projectRoot, "lib", "auth", "useSharedCloudBootstrap.ts"),
  "utf8",
);

assert.match(
  bootstrapSource,
  /const sharedCloudUserId = authSession\?\.user\?\.id \?\? null;/,
  "expected shared-cloud realtime lifecycle to key off the stable signed-in user id",
);

assert.match(
  bootstrapSource,
  /const sharedCloudChannelRef = useRef<[\s\S]+?>\(null\);/,
  "expected shared-cloud realtime lifecycle to keep the current channel instance in a ref",
);

assert.match(
  bootstrapSource,
  /const sharedCloudChannelUserIdRef = useRef<string \| null>\(null\);/,
  "expected shared-cloud realtime lifecycle to track which user owns the active channel",
);

assert.match(
  bootstrapSource,
  /if\s*\(\s*sharedCloudChannelRef\.current\s*&&\s*sharedCloudChannelUserIdRef\.current === sharedCloudUserId\s*\)\s*\{\s*return( undefined)?;/,
  "expected shared-cloud realtime setup to skip re-subscribing when the same user channel is already active",
);

assert.match(
  bootstrapSource,
  /sharedCloudChannelRef\.current = channel;/,
  "expected shared-cloud realtime setup to promote the new channel into the ownership ref",
);

assert.match(
  bootstrapSource,
  /sharedCloudChannelUserIdRef\.current = sharedCloudUserId;/,
  "expected shared-cloud realtime setup to record the owning user id for the active channel",
);

assert.match(
  bootstrapSource,
  /await supabase\.removeChannel\(existingChannel\);/,
  "expected shared-cloud realtime setup to remove any cached same-topic channel before re-subscribing",
);

assert.match(
  bootstrapSource,
  /if\s*\(\s*channel\s*&&\s*sharedCloudChannelRef\.current === channel\s*\)\s*\{\s*sharedCloudChannelRef\.current = null;[\s\S]*sharedCloudChannelUserIdRef\.current = null;/,
  "expected shared-cloud realtime cleanup to clear channel ownership refs only for the active channel",
);

assert.doesNotMatch(
  bootstrapSource,
  /\[\s*authBootstrapStatus,\s*authProfile\?\.player_name,\s*authSession,/,
  "expected shared-cloud realtime effect dependencies to stop keying off the full authSession object",
);

console.log("shared-cloud-channel-lifecycle.test.cjs passed");
