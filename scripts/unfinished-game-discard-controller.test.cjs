const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const source = read(path.join("lib", "game-draft", "useSyncedGameDraft.ts"));

assert.match(
  source,
  /const saveInFlightRef = useRef<Promise<void> \| null>\(null\);/,
  "expected useSyncedGameDraft to track an in-flight draft save promise",
);

assert.match(
  source,
  /const \[isDiscardingUnfinishedGame, setIsDiscardingUnfinishedGame\] = useState\(false\);/,
  "expected useSyncedGameDraft to track explicit unfinished-game discard state",
);

assert.match(
  source,
  /async function waitForDraftSaveIdle\(\)/,
  "expected useSyncedGameDraft to expose a helper that waits for queued or in-flight draft saves",
);

assert.match(
  source,
  /clearTimeout\(saveTimerRef\.current\);[\s\S]*saveTimerRef\.current = null;/,
  "expected waitForDraftSaveIdle to cancel queued draft saves before discard starts",
);

assert.match(
  source,
  /const inFlightSave = saveInFlightRef\.current;[\s\S]*await inFlightSave;/,
  "expected waitForDraftSaveIdle to wait for an already-running draft save before deleting the cloud row",
);

assert.match(
  source,
  /async function discardUnfinishedGame\(profileIdOverride\?: string \| null\)/,
  "expected useSyncedGameDraft to expose a dedicated explicit discard helper",
);

assert.match(
  source,
  /await waitForDraftSaveIdle\(\);/,
  "expected explicit discard to coordinate with draft-save lifecycle before cloud deletion",
);

assert.match(
  source,
  /await deleteUserGameDraft\(normalizedProfileId\);/,
  "expected explicit discard to delete the Supabase unfinished draft before clearing local state",
);

assert.match(
  source,
  /clearActiveGame\(\);[\s\S]*clearGameDraft\(\);[\s\S]*await remove\("gameDraft"\);/,
  "expected explicit discard to clear activeGame, gameDraft, and the local draft shadow after successful delete",
);

assert.match(
  source,
  /title: "Couldn't discard unfinished game"/,
  "expected explicit discard failure to publish a dedicated discard error status",
);

assert.match(
  source,
  /title: "Unfinished game discarded"/,
  "expected explicit discard success to publish a dedicated success status",
);

assert.match(
  source,
  /return \{ ok: false, message \};/,
  "expected explicit discard to return a structured failure result that UI callers can surface",
);

assert.match(
  source,
  /isDiscardingUnfinishedGame,\s*discardUnfinishedGame,/,
  "expected useSyncedGameDraft to return the explicit discard state and helper",
);

console.log("unfinished-game-discard-controller.test.cjs passed");
