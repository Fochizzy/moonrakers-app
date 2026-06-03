const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "lib", "game-draft", "useSyncedGameDraft.ts"),
  "utf8",
);

assert.match(
  source,
  /buildDraftFromLegacyActiveGame/,
  "expected useSyncedGameDraft to import the legacy active-game draft mapper",
);

assert.match(
  source,
  /resolveCloudGameSaveState/,
  "expected useSyncedGameDraft to preview finishability through resolveCloudGameSaveState",
);

assert.match(
  source,
  /async function ensureDraftForLegacyActiveGame\(activeGame:/,
  "expected useSyncedGameDraft to expose an ensureDraftForLegacyActiveGame helper",
);

assert.match(
  source,
  /const convertedDraft = buildDraftFromLegacyActiveGame\(/,
  "expected useSyncedGameDraft to build a canonical draft from the legacy active game",
);

assert.match(
  source,
  /await replaceDraft\(convertedDraft\);/,
  "expected ensureDraftForLegacyActiveGame to reuse replaceDraft for local shadow persistence and remote queueing",
);

assert.match(
  source,
  /title: "Continuing locally"/,
  "expected failed draft sync to publish a local-continuation warning instead of a hard failure title",
);

assert.match(
  source,
  /title: "Cloud finish may be blocked"/,
  "expected legacy conversion to warn when local-only roster identities will block finish-to-Supabase",
);

assert.match(
  source,
  /ensureDraftForLegacyActiveGame,/,
  "expected the synced draft hook to return ensureDraftForLegacyActiveGame",
);

console.log("legacy-active-game-draft-controller.test.cjs passed");
