type ShouldRemoteDraftWinArgs = {
  hasRemoteDraft: boolean;
  hasLocalUnsyncedChanges: boolean;
  remoteRevision: number;
  localRevision: number;
};

/**
 * Decides which copy of a draft survives session restore.
 *
 * Nothing bumps `revision` on the device — replaceDraft, updateGameplay and
 * buildGameSetupDraftFromTurnOrder all carry it through unchanged — so an
 * unsynced local edit normally holds the *same* revision as the remote row.
 * The remote copy therefore has to be strictly newer to win; treating equal
 * revisions as a remote win would silently discard every local edit that had
 * not finished syncing (a game-setup colour change, a mid-turn gameplay patch)
 * the next time the app restored the session.
 */
export function shouldRemoteDraftWin({
  hasRemoteDraft,
  hasLocalUnsyncedChanges,
  remoteRevision,
  localRevision,
}: ShouldRemoteDraftWinArgs) {
  if (!hasRemoteDraft) {
    return false;
  }

  if (!hasLocalUnsyncedChanges) {
    return true;
  }

  return remoteRevision > localRevision;
}
