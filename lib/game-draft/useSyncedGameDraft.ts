import { useEffect, useRef, useState } from "react";

import { publishAppStatus } from "@/lib/app-status/store";
import { deleteUserGameDraft } from "@/lib/cloud/game-drafts/deleteUserGameDraft";
import { loadUserGameDraft } from "@/lib/cloud/game-drafts/loadUserGameDraft";
import { saveUserGameDraft } from "@/lib/cloud/game-drafts/saveUserGameDraft";
import { resolveCloudGameSaveState } from "@/lib/game-save/resolveCloudGameSave";
import { useStore, type ActiveGame } from "@/store/useStore";
import { load, remove, save } from "@/utils/storage/storage";

import { buildDraftFromLegacyActiveGame } from "./buildDraftFromLegacyActiveGame";
import { resolveDraftResumeRoute } from "./phase";
import { shouldRemoteDraftWin } from "./resolveDraftRestoreWinner";
import type {
  GameDraft,
  GameDraftGameplay,
  GameDraftSyncState,
} from "./types";

function nowTimestamp() {
  return Date.now();
}

type DiscardUnfinishedGameResult =
  | { ok: true }
  | { ok: false; message: string };

function createInitialGameplay(): GameDraftGameplay {
  return {
    turnIndex: 0,
    rounds: [],
    totals: {},
    current: {
      prestige: 0,
      contracts: 0,
      failures: 0,
      assistRecipients: {},
      assistPrestigeRecipients: {},
      objectiveCount: 0,
      headToHeadFirstPlaceId: null,
      headToHeadSecondPlaceId: null,
    },
    roundCount: 0,
    selectedWinnerId: null,
  };
}

export function useSyncedGameDraft() {
  const authSession = useStore((state) => state.authSession);
  const players = useStore((state) => state.players);
  const groups = useStore((state) => state.groups);
  const gameDraft = useStore((state) => state.gameDraft);
  const syncState = useStore((state) => state.gameDraftSyncState);
  const hydrateGameDraft = useStore((state) => state.hydrateGameDraft);
  const setGameDraftSyncState = useStore((state) => state.setGameDraftSyncState);
  const clearGameDraft = useStore((state) => state.clearGameDraft);
  const clearActiveGame = useStore((state) => state.clearActiveGame);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef<Promise<void> | null>(null);
  const [isDiscardingUnfinishedGame, setIsDiscardingUnfinishedGame] = useState(false);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  async function persistDraftShadow(args: {
    profileId: string;
    draft: GameDraft | null;
    dirty: boolean;
    syncStatus: GameDraftSyncState["state"];
    lastSyncedAt?: number | null;
  }) {
    const profileId = String(args.profileId ?? "").trim();
    if (!profileId) {
      return;
    }

    await save("gameDraft", {
      profileId,
      draft: args.draft,
      dirty: args.dirty,
      syncState: args.syncStatus,
      lastSyncedAt: args.lastSyncedAt ?? null,
    });
  }

  async function restoreDraftForSession(profileId: string) {
    const normalizedProfileId = String(profileId ?? "").trim();
    if (!normalizedProfileId) {
      clearGameDraft();
      await remove("gameDraft");
      return null;
    }

    publishAppStatus({
      scope: "game_draft",
      state: "running",
      title: "Restoring draft",
    });
    setGameDraftSyncState({
      state: "restoring",
      dirty: false,
      conflictMessage: null,
    });

    const localShadow = await load("gameDraft", null);
    const remoteDraft = await loadUserGameDraft(normalizedProfileId);

    const localDraft =
      localShadow?.profileId === normalizedProfileId ? localShadow.draft : null;
    const hasLocalUnsyncedChanges = Boolean(
      localShadow?.profileId === normalizedProfileId &&
        localShadow?.dirty &&
        localDraft,
    );

    const remoteRevision = Number(remoteDraft?.revision ?? -1);
    const localRevision = Number(localDraft?.revision ?? -1);
    const remoteWins = shouldRemoteDraftWin({
      hasRemoteDraft: Boolean(remoteDraft),
      hasLocalUnsyncedChanges,
      remoteRevision,
      localRevision,
    });

    const effectiveDraft = remoteWins ? remoteDraft : localDraft;
    const conflictMessage =
      remoteDraft &&
      localDraft &&
      hasLocalUnsyncedChanges &&
      remoteRevision > localRevision
        ? "This draft changed on another device while this device still had unsynced edits."
        : null;

    hydrateGameDraft({
      draft: effectiveDraft,
      syncState: {
        state: effectiveDraft ? (hasLocalUnsyncedChanges ? "pending" : "saved") : "idle",
        dirty: hasLocalUnsyncedChanges,
        lastSyncedAt: remoteDraft?.updatedAt ?? null,
        conflictMessage,
      },
    });

    if (effectiveDraft) {
      await persistDraftShadow({
        profileId: normalizedProfileId,
        draft: effectiveDraft,
        dirty: hasLocalUnsyncedChanges,
        syncStatus: hasLocalUnsyncedChanges ? "pending" : "saved",
        lastSyncedAt: remoteDraft?.updatedAt ?? effectiveDraft.updatedAt ?? null,
      });
    } else {
      await remove("gameDraft");
    }

    publishAppStatus({
      scope: "game_draft",
      state: effectiveDraft ? (hasLocalUnsyncedChanges ? "stale" : "success") : "idle",
      title: effectiveDraft ? "Draft restored" : "No unfinished draft",
      detail: effectiveDraft
        ? `Resume on ${resolveDraftResumeRoute(effectiveDraft.phase)}.`
        : null,
    });

    return effectiveDraft;
  }

  async function waitForDraftSaveIdle() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const inFlightSave = saveInFlightRef.current;
    if (!inFlightSave) {
      return;
    }

    try {
      await inFlightSave;
    } catch {
      // Save failures are already reflected in sync state and should not block explicit discard.
    }
  }

  async function ensureDraftForLegacyActiveGame(activeGame: ActiveGame | null) {
    if (!activeGame || gameDraft) {
      return gameDraft;
    }

    const profileId = String(authSession?.user?.id ?? "").trim();
    if (!profileId) {
      return null;
    }

    const convertedDraft = buildDraftFromLegacyActiveGame({
      profileId,
      activeGame,
    });

    const cloudPreview = resolveCloudGameSaveState({
      activeGame: activeGame as Parameters<typeof resolveCloudGameSaveState>[0]["activeGame"],
      winnerId: activeGame.selectedWinnerId ?? null,
      playerDirectory: players,
      groupDirectory: groups,
    });

    if (cloudPreview.unresolvedPlayerNames.length) {
      publishAppStatus({
        scope: "game_draft",
        state: "success_with_warning",
        title: "Cloud finish may be blocked",
        detail: `${cloudPreview.unresolvedPlayerNames.join(", ")} need Moonrakers accounts before this game can finish to Supabase.`,
      });
    }

    await replaceDraft(convertedDraft);
    return convertedDraft;
  }

  function queueRemoteSave(nextDraft: GameDraft) {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;

      const savePromise = (async () => {
        setGameDraftSyncState({ state: "saving" });

        try {
          const savedDraft = await saveUserGameDraft(nextDraft);

          hydrateGameDraft({
            draft: savedDraft,
            syncState: {
              state: savedDraft ? "saved" : "idle",
              dirty: false,
              lastSyncedAt: savedDraft?.updatedAt ?? null,
              conflictMessage: null,
            },
          });

          await persistDraftShadow({
            profileId: nextDraft.profileId,
            draft: savedDraft,
            dirty: false,
            syncStatus: "saved",
            lastSyncedAt: savedDraft?.updatedAt ?? null,
          });

          publishAppStatus({
            scope: "game_draft",
            state: "success",
            title: "Draft saved",
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : String(error ?? "Unable to save the unfinished draft.");

          setGameDraftSyncState({
            state: "failed",
            dirty: true,
            conflictMessage: message,
          });

          await persistDraftShadow({
            profileId: nextDraft.profileId,
            draft: nextDraft,
            dirty: true,
            syncStatus: "failed",
            lastSyncedAt: nextDraft.updatedAt,
          });

          publishAppStatus({
            scope: "game_draft",
            state: "stale",
            title: "Continuing locally",
            detail: "Draft sync could not be saved yet. Local gameplay can continue on this device.",
          });
        }
      })();

      saveInFlightRef.current = savePromise;
      void savePromise.finally(() => {
        if (saveInFlightRef.current === savePromise) {
          saveInFlightRef.current = null;
        }
      });
    }, 250);
  }

  async function replaceDraft(nextDraft: GameDraft | null, options?: {
    markDirty?: boolean;
    queueSave?: boolean;
    syncState?: Partial<GameDraftSyncState>;
  }) {
    const dirty = options?.markDirty ?? Boolean(nextDraft);
    const nextState: GameDraftSyncState = {
      state: nextDraft
        ? dirty
          ? "pending"
          : "saved"
        : "idle",
      dirty,
      lastSyncedAt: options?.syncState?.lastSyncedAt ?? nextDraft?.updatedAt ?? null,
      conflictMessage: options?.syncState?.conflictMessage ?? null,
      ...options?.syncState,
    };

    hydrateGameDraft({
      draft: nextDraft,
      syncState: nextState,
    });

    const profileId =
      String(nextDraft?.profileId ?? authSession?.user?.id ?? "").trim();

    if (!nextDraft) {
      clearGameDraft();
      await remove("gameDraft");
      return;
    }

    await persistDraftShadow({
      profileId,
      draft: nextDraft,
      dirty: nextState.dirty,
      syncStatus: nextState.state,
      lastSyncedAt: nextState.lastSyncedAt ?? null,
    });

    if (options?.queueSave !== false) {
      queueRemoteSave(nextDraft);
    }
  }

  async function beginGameplay() {
    if (!gameDraft) {
      return null;
    }

    const timestamp = nowTimestamp();
    const nextDraft: GameDraft = {
      ...gameDraft,
      phase: "in_progress",
      gameplay: createInitialGameplay(),
      updatedAt: timestamp,
      deviceUpdatedAt: timestamp,
    };

    await replaceDraft(nextDraft);
    return nextDraft;
  }

  async function updateGameplay(gameplay: GameDraftGameplay, phase: GameDraft["phase"] = "in_progress") {
    if (!gameDraft) {
      return null;
    }

    const timestamp = nowTimestamp();
    const nextDraft: GameDraft = {
      ...gameDraft,
      phase,
      gameplay,
      updatedAt: timestamp,
      deviceUpdatedAt: timestamp,
    };

    await replaceDraft(nextDraft);
    return nextDraft;
  }

  async function discardUnfinishedGame(profileIdOverride?: string | null): Promise<DiscardUnfinishedGameResult> {
    if (isDiscardingUnfinishedGame) {
      return { ok: false, message: "An unfinished-game discard is already running." };
    }

    const normalizedProfileId = String(
      profileIdOverride ?? gameDraft?.profileId ?? authSession?.user?.id ?? "",
    ).trim();

    setIsDiscardingUnfinishedGame(true);
    publishAppStatus({
      scope: "game_draft",
      state: "running",
      title: "Discarding unfinished game",
    });

    try {
      await waitForDraftSaveIdle();

      if (normalizedProfileId) {
        await deleteUserGameDraft(normalizedProfileId);
      }

      clearActiveGame();
      clearGameDraft();
      await remove("gameDraft");

      publishAppStatus({
        scope: "game_draft",
        state: "success",
        title: "Unfinished game discarded",
      });

      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error ?? "Unable to discard the unfinished game.");

      publishAppStatus({
        scope: "game_draft",
        state: "failed",
        title: "Couldn't discard unfinished game",
        detail: message,
      });

      return { ok: false, message };
    } finally {
      setIsDiscardingUnfinishedGame(false);
    }
  }

  return {
    gameDraft,
    syncState,
    restoreDraftForSession,
    replaceDraft,
    queueRemoteSave,
    beginGameplay,
    updateGameplay,
    ensureDraftForLegacyActiveGame,
    isDiscardingUnfinishedGame,
    discardUnfinishedGame,
    clearGameDraft,
    hydrateGameDraft,
    setGameDraftSyncState,
    deleteUserGameDraft,
  };
}
