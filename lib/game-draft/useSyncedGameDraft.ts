import { useEffect, useRef } from "react";

import { publishAppStatus } from "@/lib/app-status/store";
import { deleteUserGameDraft } from "@/lib/cloud/game-drafts/deleteUserGameDraft";
import { loadUserGameDraft } from "@/lib/cloud/game-drafts/loadUserGameDraft";
import { saveUserGameDraft } from "@/lib/cloud/game-drafts/saveUserGameDraft";
import { useStore } from "@/store/useStore";
import { load, remove, save } from "@/utils/storage/storage";

import { resolveDraftResumeRoute } from "./phase";
import type {
  GameDraft,
  GameDraftGameplay,
  GameDraftSyncState,
} from "./types";

function nowTimestamp() {
  return Date.now();
}

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
  const gameDraft = useStore((state) => state.gameDraft);
  const syncState = useStore((state) => state.gameDraftSyncState);
  const hydrateGameDraft = useStore((state) => state.hydrateGameDraft);
  const setGameDraftSyncState = useStore((state) => state.setGameDraftSyncState);
  const clearGameDraft = useStore((state) => state.clearGameDraft);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const remoteWins = Boolean(
      remoteDraft &&
        (!hasLocalUnsyncedChanges || remoteRevision >= localRevision),
    );

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

  function queueRemoteSave(nextDraft: GameDraft) {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
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
          state: "failed",
          title: "Draft save failed",
          detail: message,
        });
      }
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

  async function discardDraft(profileIdOverride?: string | null) {
    const normalizedProfileId = String(
      profileIdOverride ?? gameDraft?.profileId ?? authSession?.user?.id ?? "",
    ).trim();

    if (normalizedProfileId) {
      await deleteUserGameDraft(normalizedProfileId);
    }

    clearGameDraft();
    await remove("gameDraft");
    publishAppStatus({
      scope: "game_draft",
      state: "success",
      title: "Draft discarded",
    });
  }

  return {
    gameDraft,
    syncState,
    restoreDraftForSession,
    replaceDraft,
    queueRemoteSave,
    beginGameplay,
    updateGameplay,
    discardDraft,
    clearGameDraft,
    hydrateGameDraft,
    setGameDraftSyncState,
    deleteUserGameDraft,
  };
}
