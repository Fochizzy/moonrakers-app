import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import { parseBackupPayload } from "../../utils/backup";
import { buildLegacyMigrationPayload } from "./buildLegacyMigrationPayload";
import { importLegacyPayload } from "./importLegacyPayload";

type ResolvedProfile = {
  id: string;
  player_name: string;
};

export async function importBackupFromPicker(input: {
  signedInProfileId: string;
  signedInPlayerName: string;
  resolvedProfilesByName: Record<string, ResolvedProfile>;
}) {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/json"],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    return { imported: false as const, reason: "cancelled" as const };
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    throw new Error("Selected backup did not include a readable file URI.");
  }

  const raw = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const backup = parseBackupPayload(JSON.parse(raw));
  const payload = buildLegacyMigrationPayload({
    signedInProfileId: input.signedInProfileId,
    signedInPlayerName: input.signedInPlayerName,
    localPlayers: backup.players,
    localGroups: backup.groups,
    localGames: backup.games,
    resolvedProfilesByName: input.resolvedProfilesByName,
  });

  const resultPayload = await importLegacyPayload({
    hostProfileId: input.signedInProfileId,
    payload,
  });

  return {
    imported: true as const,
    importedGroups: resultPayload.importedGroups,
    importedGames: resultPayload.importedGames,
  };
}
