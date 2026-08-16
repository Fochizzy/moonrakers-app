import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import ActionButton from "@/components/ui/ActionButton";
import AppHeader from "@/components/ui/AppHeader";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import {
  useAuthProfile,
  useAuthSession,
  useGames,
  useGroups,
  useHydrateCloudSnapshot,
  usePlayers,
} from "@/store/useStore";
import { loadHydratedCloudState } from "@/lib/cloud/loadHydratedCloudState";
import { importBackupFromPicker } from "@/lib/migration/importBackupFromPicker";
import { buildPlayersCsv, exportGamesToCSV } from "@/utils/csv/exportCSV";
import { commitFeedback, warningFeedback } from "@/utils/haptics";
import { buildHomeRoute } from "@/utils/appRoutes";

type BusyAction = "backup" | "players" | "import" | null;

function timestampSlug(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
}

export default function DataBackupScreen() {
  const router = useRouter();
  const players = usePlayers() ?? [];
  const groups = useGroups() ?? [];
  const games = useGames() ?? [];
  const authSession = useAuthSession();
  const authProfile = useAuthProfile();
  const hydrateCloudSnapshot = useHydrateCloudSnapshot();

  const [busy, setBusy] = useState<BusyAction>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const signedInProfileId = String(authSession?.user?.id ?? "").trim();
  const signedInPlayerName = String(
    (authProfile as Record<string, unknown> | null)?.player_name ?? "",
  ).trim();
  const canImport = Boolean(signedInProfileId && signedInPlayerName);

  const summary = useMemo(
    () => ({
      players: players.length,
      groups: groups.length,
      games: games.length,
    }),
    [players.length, groups.length, games.length],
  );

  // Legacy import matches saved player names to cloud profiles, keyed by the
  // lowercased name the payload builder uses.
  const resolvedProfilesByName = useMemo(() => {
    const resolved: Record<string, { id: string; player_name: string }> = {};

    for (const player of players as Array<Record<string, unknown>>) {
      const id = String(player?.id ?? "").trim();
      const name = String(player?.name ?? "").trim();
      if (!id || !name) continue;
      resolved[name.toLowerCase()] = { id, player_name: name };
    }

    return resolved;
  }, [players]);

  async function handleExportBackup() {
    if (busy) return;

    if (!games.length && !players.length) {
      warningFeedback();
      Alert.alert("Nothing to export", "Play or import a game first.");
      return;
    }

    setBusy("backup");
    try {
      const fileName = `Moonrakers-backup-${timestampSlug(new Date())}.json`;
      await exportGamesToCSV(
        {
          players: players as never,
          groups,
          games,
          meta: {
            exportedBy: signedInPlayerName || null,
            profileId: signedInProfileId || null,
          },
        },
        fileName,
      );
      commitFeedback();
      setLastResult(
        `Exported ${summary.games} games, ${summary.players} players and ${summary.groups} groups.`,
      );
    } catch (error) {
      console.error("Export backup failed:", error);
      warningFeedback();
      Alert.alert(
        "Export failed",
        error instanceof Error ? error.message : "Could not write the backup file.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleExportPlayersCsv() {
    if (busy) return;

    if (!players.length) {
      warningFeedback();
      Alert.alert("No players", "Add players before exporting a roster CSV.");
      return;
    }

    setBusy("players");
    try {
      const writableDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!writableDir) {
        throw new Error("No writable local directory is available.");
      }

      const fileUri = `${writableDir}Moonrakers-players-${timestampSlug(new Date())}.csv`;
      await FileSystem.writeAsStringAsync(
        fileUri,
        buildPlayersCsv(players as never),
        { encoding: FileSystem.EncodingType.UTF8 },
      );

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Choose where to send your roster CSV",
          UTI: "public.comma-separated-values-text",
        });
      }

      commitFeedback();
      setLastResult(`Exported ${summary.players} players as CSV.`);
    } catch (error) {
      console.error("Export players CSV failed:", error);
      warningFeedback();
      Alert.alert(
        "Export failed",
        error instanceof Error ? error.message : "Could not write the roster CSV.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleImportBackup() {
    if (busy) return;

    if (!canImport) {
      warningFeedback();
      Alert.alert(
        "Sign in first",
        "Importing writes games into your cloud league, so you need to be signed in.",
      );
      return;
    }

    setBusy("import");
    try {
      const result = await importBackupFromPicker({
        signedInProfileId,
        signedInPlayerName,
        resolvedProfilesByName,
      });

      if (!result.imported) {
        setBusy(null);
        return;
      }

      // Pull the freshly imported games back down so every screen sees them.
      const hydrated = await loadHydratedCloudState(authSession as never);
      hydrateCloudSnapshot(hydrated);

      commitFeedback();
      setLastResult(
        `Imported ${result.importedGames} games and ${result.importedGroups} groups.`,
      );
    } catch (error) {
      console.error("Import backup failed:", error);
      warningFeedback();
      Alert.alert(
        "Import failed",
        error instanceof Error ? error.message : "Could not read that backup file.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageShell preset="quiet">
      <AppHeader
        eyebrow="Data"
        title="Backup & Export"
        subtitle="Take your league history with you"
      />

      <SectionCard
        title="What you have"
        subtitle={`${summary.games} games · ${summary.players} players · ${summary.groups} groups`}
      >
        <Text style={styles.body}>
          A backup is a single JSON file holding every game, round, player and group on this
          account. It restores into this app and is readable anywhere else.
        </Text>
      </SectionCard>

      <SectionCard title="Export">
        <View style={styles.actions}>
          <ActionButton
            title="Export full backup"
            subtitle="JSON · every game, round and player"
            variant="primary"
            disabled={busy !== null}
            onPress={() => {
              void handleExportBackup();
            }}
          />
          <ActionButton
            title="Export roster CSV"
            subtitle="Spreadsheet-friendly player metrics"
            variant="secondary"
            disabled={busy !== null}
            onPress={() => {
              void handleExportPlayersCsv();
            }}
          />
        </View>
      </SectionCard>

      <SectionCard
        title="Import"
        subtitle={canImport ? undefined : "Sign in to import"}
      >
        <Text style={styles.body}>
          Restores a Moonrakers backup file into your cloud league. Games already on this
          account are matched and skipped rather than duplicated.
        </Text>
        <View style={styles.actions}>
          <ActionButton
            title="Import backup file"
            subtitle="Pick a Moonrakers .json backup"
            variant="ghost"
            disabled={busy !== null || !canImport}
            onPress={() => {
              void handleImportBackup();
            }}
          />
        </View>
      </SectionCard>

      {lastResult ? (
        <SectionCard>
          <Text style={styles.result}>{lastResult}</Text>
        </SectionCard>
      ) : null}

      <View style={styles.footer}>
        <ActionButton
          title="Back"
          variant="ghost"
          onPress={() => router.replace(buildHomeRoute("hubs"))}
        />
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  body: {
    color: "rgba(226,238,255,0.78)",
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    gap: 10,
    marginTop: 12,
  },
  result: {
    color: "#7DD3FC",
    fontSize: 13,
    fontWeight: "600",
  },
  footer: {
    marginTop: 8,
  },
});
