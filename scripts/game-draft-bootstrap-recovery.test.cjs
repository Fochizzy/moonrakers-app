const fs = require("node:fs");
const assert = require("node:assert/strict");
const path = require("node:path");

// Guards must resolve files relative to the repo, not this machine.
const projectRoot = path.resolve(__dirname, "..");

const bootstrap = fs.readFileSync(
  path.join(projectRoot, "lib/auth/useSharedCloudBootstrap.ts"),
  "utf8",
);

assert.match(bootstrap, /useSyncedGameDraft/);
assert.match(bootstrap, /restoreDraftForSession/);
assert.match(bootstrap, /clearGameDraft/);
assert.match(bootstrap, /remove\("gameDraft"\)/);

console.log("game-draft-bootstrap-recovery.test.cjs passed");
