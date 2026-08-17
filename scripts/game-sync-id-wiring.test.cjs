const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const homeSource = read(path.join("app", "index.tsx"));
const storeSource = read(path.join("store", "useStore.ts"));
const legacyDraftSource = read(
  path.join("lib", "game-draft", "buildDraftFromLegacyActiveGame.ts"),
);
const payloadSource = read(
  path.join("lib", "game-save", "buildCompletedGamePayload.ts"),
);

assert.match(
  homeSource,
  /createUuid/,
  "expected the home screen to import a UUID helper for seeded synced drafts",
);

assert.match(
  homeSource,
  /const\s+selectionDraftId\s*=\s*useRef\(gameDraft\?\.draftId\s*\?\?\s*createUuid\(\)\)\.current/,
  "expected player authorization to receive a stable UUID before the draft is saved",
);
assert.match(
  homeSource,
  /draftId:\s*gameDraft\?\.draftId\s*\?\?\s*selectionDraftId/,
  "expected the saved draft to reuse the UUID used for player authorization",
);

assert.match(
  storeSource,
  /createUuid/,
  "expected the store to import a UUID helper for new active games",
);

assert.match(
  storeSource,
  /activeGame:\s*{\s*id:\s*createUuid\(\),/s,
  "expected startActiveGame to create UUID-backed active-game ids",
);

assert.match(
  legacyDraftSource,
  /resolveStableUuid/,
  "expected legacy active-game conversion to normalize old local ids onto UUID draft ids",
);

assert.match(
  legacyDraftSource,
  /draftId:\s*resolveStableUuid\(\s*LEGACY_ACTIVE_GAME_DRAFT_NAMESPACE,\s*activeGame\.id,?\s*\)/,
  "expected legacy active-game conversion to derive draft ids deterministically from the legacy id",
);

assert.match(
  payloadSource,
  /client_game_id:/,
  "expected completed-game payloads to restore a client_game_id for idempotent finish saves",
);

assert.match(
  payloadSource,
  /coerceUuid\(input\.activeGame\.id\)/,
  "expected completed-game payloads to guard client_game_id behind UUID validation",
);

console.log("game-sync-id-wiring.test.cjs passed");
