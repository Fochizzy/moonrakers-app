const fs = require("node:fs");
const assert = require("node:assert/strict");

const bootstrap = fs.readFileSync(
  "C:/Users/izzyh/Desktop/moonrakers-app/lib/auth/useSharedCloudBootstrap.ts",
  "utf8",
);

assert.match(bootstrap, /useSyncedGameDraft/);
assert.match(bootstrap, /restoreDraftForSession/);
assert.match(bootstrap, /clearGameDraft/);
assert.match(bootstrap, /remove\("gameDraft"\)/);

console.log("game-draft-bootstrap-recovery.test.cjs passed");
