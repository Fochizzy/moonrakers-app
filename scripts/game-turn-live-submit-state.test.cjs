const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(projectRoot, "app", "game.tsx"), "utf8");
const draftHookSource = fs.readFileSync(
  path.join(projectRoot, "lib", "game-draft", "useSyncedGameDraft.ts"),
  "utf8",
);

assert.match(
  source,
  /function commitGameplayPatch\([\s\S]*const nextGameplay = \{[\s\S]*void updateGameplay\(\s*nextGameplay,\s*phase,\s*\);/s,
  "expected turn edits to route through the draft so End Turn unlocks immediately for valid mission modes",
);

assert.doesNotMatch(
  source,
  /patchActiveGame/,
  "expected the game screen to stop writing activeGame directly: it is a projection of the draft and any direct patch is overwritten by the next projection",
);

// The immediate End Turn unlock depends on replaceDraft reprojecting activeGame
// synchronously, before it awaits any persistence work.
const replaceDraftIndex = draftHookSource.indexOf(
  "async function replaceDraft(",
);

assert.notEqual(
  replaceDraftIndex,
  -1,
  "expected the synced draft hook to expose replaceDraft",
);

const replaceDraftBody = draftHookSource.slice(replaceDraftIndex);
const hydrateIndex = replaceDraftBody.indexOf("hydrateGameDraft({");
const firstAwaitIndex = replaceDraftBody.indexOf("await ");

assert.notEqual(
  hydrateIndex,
  -1,
  "expected replaceDraft to reproject activeGame through hydrateGameDraft",
);

assert.ok(
  hydrateIndex < firstAwaitIndex,
  "expected replaceDraft to reproject activeGame synchronously, before awaiting persistence, so turn edits land in the UI on the next render",
);

console.log("game-turn-live-submit-state.test.cjs passed");
