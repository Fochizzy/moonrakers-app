import { useMemo, useState } from "react";

import { publishAppStatus, useClearAppStatus, useCurrentAppStatus } from "@/lib/app-status/store";
import { loadHydratedCloudState } from "@/lib/cloud/loadHydratedCloudState";
import { deleteCompletedGame } from "@/lib/game-save/deleteCompletedGame";
import { formatSupabaseConfigError } from "@/lib/supabase";
import type { AuthSession } from "@/store/useStore";

type AuthSessionLike = {
  user?: {
    id?: string | null;
  } | null;
} | null;

type HookArgs = {
  authSession: AuthSessionLike;
  // Typed against what this hook actually passes in, so the store's stricter
  // hydrate function is assignable under strictFunctionTypes.
  hydrateCloudSnapshot: (
    input: Awaited<ReturnType<typeof loadHydratedCloudState>>,
  ) => void;
};

export function useHistoryDataManager(args: HookArgs) {
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);
  const clearStatus = useClearAppStatus();
  const currentStatus = useCurrentAppStatus();

  async function refreshCloudHistoryState(activeSession: AuthSessionLike = args.authSession) {
    if (!activeSession?.user?.id) {
      return;
    }

    args.hydrateCloudSnapshot(await loadHydratedCloudState(activeSession as AuthSession));
  }

  async function removeGame(gameId: string, activeSession: AuthSessionLike = args.authSession) {
    const normalizedGameId = String(gameId ?? "").trim();
    if (!normalizedGameId) {
      throw new Error("gameId is required");
    }

    setDeletingGameId(normalizedGameId);
    publishAppStatus({
      scope: "history_delete",
      state: "running",
      title: "Deleting game",
      detail: "Removing the selected Supabase-saved game and refreshing history.",
    });

    try {
      await deleteCompletedGame(normalizedGameId);

      try {
        await refreshCloudHistoryState(activeSession);
        publishAppStatus({
          scope: "history_delete",
          state: "success",
          title: "Game deleted",
          detail: "The selected game was removed from Supabase and local history refreshed.",
        });
      } catch (refreshError) {
        console.error("Game deleted, but cloud refresh failed:", refreshError);
        publishAppStatus({
          scope: "history_delete",
          state: "success_with_warning",
          title: "Game deleted with refresh pending",
          detail: "The game was deleted from Supabase, but the local view could not refresh yet.",
        });
      }
    } catch (error) {
      const detail =
        formatSupabaseConfigError(error) || "Something went wrong deleting the game.";
      publishAppStatus({
        scope: "history_delete",
        state: "failed",
        title: "Couldn't delete game",
        detail,
      });
      throw new Error(detail);
    } finally {
      setDeletingGameId((current) => (current === normalizedGameId ? null : current));
    }
  }

  return {
    deletingGameId,
    status: useMemo(
      () => (currentStatus && currentStatus.scope === "history_delete" ? currentStatus : null),
      [currentStatus],
    ),
    clearStatus: () => {
      clearStatus("history_delete");
    },
    refreshCloudHistoryState,
    removeGame,
  };
}
