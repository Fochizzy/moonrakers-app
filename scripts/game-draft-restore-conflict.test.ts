import assert from "node:assert/strict";

import { shouldRemoteDraftWin } from "../lib/game-draft/resolveDraftRestoreWinner.ts";

// The regression this guards: a game-setup colour change (or any other edit that
// has not finished syncing) was discarded on the next session restore, because
// nothing bumps `revision` on the device and equal revisions counted as a remote win.
assert.equal(
  shouldRemoteDraftWin({
    hasRemoteDraft: true,
    hasLocalUnsyncedChanges: true,
    remoteRevision: 4,
    localRevision: 4,
  }),
  false,
  "expected an unsynced local edit to survive restore when the remote row is no newer",
);

assert.equal(
  shouldRemoteDraftWin({
    hasRemoteDraft: true,
    hasLocalUnsyncedChanges: true,
    remoteRevision: 5,
    localRevision: 4,
  }),
  true,
  "expected a strictly newer remote draft to win over local unsynced changes",
);

assert.equal(
  shouldRemoteDraftWin({
    hasRemoteDraft: true,
    hasLocalUnsyncedChanges: true,
    remoteRevision: 3,
    localRevision: 4,
  }),
  false,
  "expected a stale remote draft to lose to newer local work",
);

assert.equal(
  shouldRemoteDraftWin({
    hasRemoteDraft: true,
    hasLocalUnsyncedChanges: false,
    remoteRevision: 1,
    localRevision: 9,
  }),
  true,
  "expected the remote draft to win outright when the device has nothing unsynced",
);

assert.equal(
  shouldRemoteDraftWin({
    hasRemoteDraft: false,
    hasLocalUnsyncedChanges: false,
    remoteRevision: -1,
    localRevision: -1,
  }),
  false,
  "expected no remote draft to mean the local copy is used",
);

console.log("game-draft-restore-conflict.test.ts passed");
