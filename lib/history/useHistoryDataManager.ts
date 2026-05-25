import { useMemo, useState } from "react";

import { publishAppStatus, useClearAppStatus, useCurrentAppStatus } from "@/lib/app-status/store";
import { loadCloudSnapshot } from "@/lib/cloud/loadCloudSnapshot";
import { loadRegisteredProfiles } from "@/lib/cloud/loadRegisteredProfiles";
import { loadStatsSnapshot } from "@/lib/cloud/loadStatsSnapshot";
import { deleteCompletedGame } from "@/lib/game-save/deleteCompletedGame";
import { importBackupFromPicker } from "@/lib/migration/importBackupFromPicker";
import { formatSupabaseConfigError } from "@/lib/supabase";
import { mergeRegisteredProfilesIntoPlayers } from "@/utils/registeredProfilePlayer";

type AuthSessionLike = {
  user?: {
    id?: string | null;
  } | null;
} | null;

type AuthProfileLike = {
  id?: string | null;
  player_name?: string | null;
  display_name?: string | null;
} | null;

type HookArgs = {
  authSession: AuthSessionLike;
  authProfile: AuthProfileLike;
  hydrateCloudSnapshot: (input: {
    session: AuthSessionLike;
    snapshot: unknown;
    statsSnapshot?: unknown;
  }) => void;
};

export function useHistoryDataManager(args: HookArgs) {
  const [importingBackup, setImportingBackup] = useState(false);
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);
  const clearStatus = useClearAppStatus();
  const currentStatus = useCurrentAppStatus();

  async function refreshCloudHistoryState(activeSession: AuthSessionLike = args.authSession) {
    if (!activeSession?.user?.id) {
      return;
    }

    const [snapshot, registeredProfiles] = await Promise.all([
      loadCloudSnapshot(activeSession.user.id),
      loadRegisteredProfiles().catch(() => []),
    ]);
    const statsSnapshot = await loadStatsSnapshot({
      profileId: activeSession.user.id,
      groups: snapshot.groups,
      games: snapshot.games,
    });

    args.hydrateCloudSnapshot({
      session: activeSession,
      snapshot: {
        ...snapshot,
        players: mergeRegisteredProfilesIntoPlayers(snapshot.players, registeredProfiles),
      },
      statsSnapshot,
    });
  }

  async function importBackup() {
    const signedInProfileId = String(args.authSession?.user?.id ?? "").trim();
    const signedInPlayerName =
      String(args.authProfile?.player_name ?? "").trim() ||
      String(args.authProfile?.display_name ?? "").trim();

    if (!signedInProfileId || !signedInPlayerName) {
      const detail = "Finish login and profile setup before importing a backup.";
      publishAppStatus({
        scope: "history_import",
        state: "failed",
        title: "Profile required",
        detail,
      });
      throw new Error(detail);
    }

    setImportingBackup(true);
    publishAppStatus({
      scope: "history_import",
      state: "running",
      title: "Importing backup",
      detail: "Reading the selected JSON backup and merging it into this cloud profile.",
    });

    try {
      const registeredProfiles = await loadRegisteredProfiles().catch(() => []);
      const resolvedProfilesByName = Object.fromEntries(
        registeredProfiles.flatMap((profile: any) => {
          const name = String(profile?.name ?? "").trim();
          const displayName = String(profile?.displayName ?? "").trim();
          const value = { id: String(profile?.id ?? "").trim(), player_name: name };

          return [name, displayName]
            .map((candidate) => candidate.trim().toLowerCase())
            .filter(Boolean)
            .map((candidate) => [candidate, value] as const);
        }),
      );

      const result = await importBackupFromPicker({
        signedInProfileId,
        signedInPlayerName,
        resolvedProfilesByName,
      });

      if (!result.imported) {
        publishAppStatus({
          scope: "history_import",
          state: "idle",
          title: "Import cancelled",
          detail: "No backup file was selected.",
        });
        return result;
      }

      try {
        await refreshCloudHistoryState();
        publishAppStatus({
          scope: "history_import",
          state: "success",
          title: "Backup imported",
          detail: `Imported ${result.importedGroups} groups and ${result.importedGames} games.`,
        });
      } catch (refreshError) {
        console.error("Backup imported, but cloud refresh failed:", refreshError);
        publishAppStatus({
          scope: "history_import",
          state: "success_with_warning",
          title: "Backup imported with refresh pending",
          detail: `Imported ${result.importedGroups} groups and ${result.importedGames} games, but the local view could not refresh yet.`,
        });
      }

      return result;
    } catch (error) {
      const detail =
        formatSupabaseConfigError(error) ||
        "Something went wrong while importing that backup.";
      publishAppStatus({
        scope: "history_import",
        state: "failed",
        title: "Import failed",
        detail,
      });
      throw new Error(detail);
    } finally {
      setImportingBackup(false);
    }
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
    importingBackup,
    deletingGameId,
    status: useMemo(
      () =>
        currentStatus &&
        (currentStatus.scope === "history_import" || currentStatus.scope === "history_delete")
          ? currentStatus
          : null,
      [currentStatus],
    ),
    clearStatus: () => {
      clearStatus("history_import");
      clearStatus("history_delete");
    },
    refreshCloudHistoryState,
    importBackup,
    removeGame,
  };
}
