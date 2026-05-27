import { Alert } from "react-native";

import { publishAppStatus, useClearAppStatus, useCurrentAppStatus } from "@/lib/app-status/store";
import { loadHydratedCloudState } from "@/lib/cloud/loadHydratedCloudState";
import { createSharedGroup } from "@/lib/cloud/sharedGroups";
import { resolveCloudGameSaveState } from "@/lib/game-save/resolveCloudGameSave";
import { saveCompletedGame } from "@/lib/game-save/saveCompletedGame";
import { formatSupabaseConfigError } from "@/lib/supabase";

import { prepareFinishGameState, type SessionRound } from "./gameSessionController.ts";

type AuthSessionLike = {
  user?: {
    id?: string | null;
  } | null;
} | null;

type RouterLike = {
  replace: (href: string) => void;
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
  hydrateCloudSnapshot: (input: {
    session: AuthSessionLike;
    snapshot: unknown;
    statsSnapshot?: unknown;
  }) => void;
  router: RouterLike;
};

export function useGameSessionController(args: HookArgs) {
  const clearStatus = useClearAppStatus();
  const currentStatus = useCurrentAppStatus();

  async function commitFinishGame() {
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
        activeGame: prepared.cloudGame as any,
        winnerId: prepared.winnerId,
        playerDirectory: args.playerDirectory as any,
        groupDirectory: args.groupDirectory as any,
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

      await saveCompletedGame({
        hostProfileId: args.authSession.user.id!,
        activeGame: cloudGame,
        winnerId: cloudSave.winnerId,
      });

      await args.onDraftFinished?.();
      args.clearActiveGame();

      try {
        publishAppStatus({
          scope: "cloud_refresh",
          state: "running",
          title: "Refreshing saved game state",
          detail: "Pulling the latest Supabase snapshot and analytics into this device.",
        });

        const hydratedSnapshot = await loadHydratedCloudState(args.authSession as any);
        args.hydrateCloudSnapshot(hydratedSnapshot);

        publishAppStatus({
          scope: "cloud_save",
          state: "success",
          title: "Game saved",
          detail: "Supabase save, analytics refresh, and local hydration are up to date.",
        });
      } catch (refreshError) {
        console.error("Finished game saved, but cloud refresh failed:", refreshError);
        publishAppStatus({
          scope: "cloud_refresh",
          state: "success_with_warning",
          title: "Game saved with refresh pending",
          detail: "The game was saved to Supabase, but the local view could not refresh yet.",
        });
        args.router.replace("/");
        Alert.alert(
          "Game saved",
          "The game was saved to Supabase, but the local view could not refresh yet.",
        );
        return;
      }

      args.router.replace("/");
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
    commitFinishGame,
  };
}
