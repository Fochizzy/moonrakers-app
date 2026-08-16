import { useRef, useState } from "react";
import { Alert } from "react-native";

import { publishAppStatus, useClearAppStatus, useCurrentAppStatus } from "@/lib/app-status/store";
import { markRollupPossiblyStale } from "@/lib/cloud/analytics/reconcileStaleRollup";
import { loadHydratedCloudState } from "@/lib/cloud/loadHydratedCloudState";
import { createSharedGroup } from "@/lib/cloud/sharedGroups";
import { resolveCloudGameSaveState } from "@/lib/game-save/resolveCloudGameSave";
import { refreshFinishedGameCloudState } from "@/lib/game-save/refreshFinishedGameCloudState";
import { saveCompletedGame } from "@/lib/game-save/saveCompletedGame";
import { formatSupabaseConfigError } from "@/lib/supabase";
import type { AuthSession } from "@/store/useStore";
import { buildHomeRoute } from "@/utils/appRoutes";

import { prepareFinishGameState, type SessionRound } from "./gameSessionController.ts";

type AuthSessionLike = {
  user?: {
    id?: string | null;
  } | null;
} | null;

type CloudGameSaveInput = Parameters<typeof resolveCloudGameSaveState>[0];

type RouterLike = {
  replace: (href: string | ReturnType<typeof buildHomeRoute>) => void;
};

type HookArgs = {
  activeGame: Record<string, unknown> | null;
  players: Array<Record<string, unknown>>;
  rounds: SessionRound[];
  winnerId?: string | null;
  authSession: AuthSessionLike;
  playerDirectory: Array<Record<string, unknown>>;
  groupDirectory: Array<Record<string, unknown>>;
  clearActiveGame: () => void;
  onDraftFinished?: () => Promise<void> | void;
  // Typed against what this hook actually passes in, so the store's stricter
  // hydrate function is assignable under strictFunctionTypes.
  hydrateCloudSnapshot: (
    input: Awaited<ReturnType<typeof loadHydratedCloudState>>,
  ) => void;
  router: RouterLike;
};

export function useGameSessionController(args: HookArgs) {
  const clearStatus = useClearAppStatus();
  const currentStatus = useCurrentAppStatus();
  const finishInFlightRef = useRef(false);
  const [isFinishingGame, setIsFinishingGame] = useState(false);

  // Runs after navigation starts so the game screen never paints its
  // no-active-game fallback, but stays awaited: a promise continuation still
  // runs when the app is backgrounded, whereas a requestAnimationFrame callback
  // is throttled or dropped entirely. Stranding it there would leave the draft
  // row in Supabase and the finished game resumable on the next launch.
  async function runFinishedGameCleanup() {
    try {
      await args.onDraftFinished?.();
    } catch (cleanupError) {
      console.error("Finished game cleanup failed:", cleanupError);
    } finally {
      args.clearActiveGame();
    }
  }

  async function commitFinishGame() {
    if (isFinishingGame) {
      return;
    }

    if (finishInFlightRef.current) {
      return;
    }

    finishInFlightRef.current = true;
    setIsFinishingGame(true);

    try {
      if (!args.activeGame) {
        return;
      }

      if (!args.authSession?.user?.id) {
        publishAppStatus({
          scope: "cloud_save",
          state: "failed",
          title: "Login required",
          detail: "Log in before saving a cloud game.",
        });
        Alert.alert("Login required", "Log in before saving a cloud game.");
        return;
      }

      const winnerId = String(
        args.winnerId ??
          (args.activeGame as Record<string, unknown>)?.selectedWinnerId ??
          (args.activeGame as Record<string, unknown>)?.winnerId ??
          (args.activeGame as Record<string, unknown>)?.manualWinnerId ??
          "",
      ).trim() || null;

      publishAppStatus({
        scope: "cloud_save",
        state: "running",
        title: "Saving game",
        detail: "Publishing this result to Supabase and refreshing your local view.",
      });

      const prepared = prepareFinishGameState({
        activeGame: args.activeGame,
        players: args.players,
        rounds: args.rounds,
        winnerId,
      });

      const cloudSave = resolveCloudGameSaveState({
        // prepareFinishGameState works over loose records, so the prepared game
        // has no declared `id`; the resolver normalizes it defensively.
        activeGame: prepared.cloudGame as unknown as CloudGameSaveInput["activeGame"],
        winnerId: prepared.winnerId,
        playerDirectory: args.playerDirectory as CloudGameSaveInput["playerDirectory"],
        groupDirectory: args.groupDirectory as CloudGameSaveInput["groupDirectory"],
      });

      if (cloudSave.unresolvedPlayerNames.length) {
        const detail = `${cloudSave.unresolvedPlayerNames.join(", ")} need Moonrakers accounts before this game can be saved to Supabase.`;
        publishAppStatus({
          scope: "cloud_save",
          state: "failed",
          title: "Registered players required",
          detail,
        });
        Alert.alert("Registered players required", detail);
        return;
      }

      let cloudGame = cloudSave.activeGame;
      if (cloudSave.createGroupRequest) {
        const sharedGroup = await createSharedGroup({
          createdBy: args.authSession.user.id!,
          name: cloudSave.createGroupRequest.name,
          playerIds: cloudSave.createGroupRequest.playerIds,
        });

        cloudGame = {
          ...cloudGame,
          groupId: sharedGroup.id,
          groupName: sharedGroup.name,
        };
      }

      const savedGameId = await saveCompletedGame({
        hostProfileId: args.authSession.user.id!,
        activeGame: cloudGame,
        winnerId: cloudSave.winnerId,
      });

      try {
        publishAppStatus({
          scope: "cloud_refresh",
          state: "running",
          title: "Refreshing saved game state",
          detail: "Pulling the latest Supabase snapshot and analytics into this device.",
        });

        await refreshFinishedGameCloudState({
          gameId: String(savedGameId),
          participantProfileIds: (cloudGame.players ?? [])
            .map((player) => String((player as { id?: string | null })?.id ?? "").trim())
            .filter(Boolean),
        });

        const hydratedSnapshot = await loadHydratedCloudState(args.authSession as AuthSession);
        args.hydrateCloudSnapshot(hydratedSnapshot);

        publishAppStatus({
          scope: "cloud_save",
          state: "success",
          title: "Game saved",
          detail: "Supabase save, analytics refresh, and local hydration are up to date.",
        });
      } catch (refreshError) {
        console.error("Finished game saved, but cloud refresh failed:", refreshError);
        // The rollup is now known to be behind this save; make sure the
        // once-per-session reconcile re-checks instead of trusting its earlier run.
        markRollupPossiblyStale();
        publishAppStatus({
          scope: "cloud_refresh",
          state: "success_with_warning",
          title: "Game saved with refresh pending",
          detail: "The game was saved to Supabase, but the local view could not refresh yet.",
        });
        args.router.replace(buildHomeRoute());
        await runFinishedGameCleanup();
        Alert.alert(
          "Game saved",
          "The game was saved to Supabase, but the local view could not refresh yet.",
        );
        return;
      }

      args.router.replace(buildHomeRoute());
      await runFinishedGameCleanup();
    } catch (error) {
      console.error("Finish Game failed:", error);
      const detail =
        formatSupabaseConfigError(error) || "Something went wrong finishing the game.";
      publishAppStatus({
        scope: "cloud_save",
        state: "failed",
        title: "Couldn't save game",
        detail,
      });
      Alert.alert("Couldn't save game", detail);
    } finally {
      finishInFlightRef.current = false;
      setIsFinishingGame(false);
    }
  }

  return {
    currentStatus:
      currentStatus?.scope === "cloud_save" || currentStatus?.scope === "cloud_refresh"
        ? currentStatus
        : null,
    clearCurrentStatus: () => {
      clearStatus("cloud_save");
      clearStatus("cloud_refresh");
    },
    isFinishingGame,
    commitFinishGame,
  };
}
