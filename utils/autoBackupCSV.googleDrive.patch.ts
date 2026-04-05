import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { uploadLocalFileToGoogleDrive, getValidGoogleDriveAccessToken } from './googleDriveBackup';
import { createAutoBackupHybridPayload, type StorePlayer, type StoreGroup, type StoreGame } from './autoBackupCSV';

const GOOGLE_DRIVE_BACKUP_FOLDER_ID: string | undefined =
  Constants.expoConfig?.extra?.googleDriveFolderId ?? '1x33WTp_BdR1c8ykE1zbT6K51w43N-VWq';

export type AutoBackupDriveResult = {
  ok: boolean;
  fileId?: string;
  reason?: string;
  silent?: boolean;
};

export type SaveAutoBackupWithGoogleDriveResult = {
  fileUri: string;
  driveResult: AutoBackupDriveResult;
};

export async function saveAutoBackupWithGoogleDrive(
  data: {
    players?: StorePlayer[];
    groups?: StoreGroup[];
    games?: StoreGame[];
  },
  options?: {
    promptIfNeeded?: boolean;
    backupFileName?: string;
  }
): Promise<SaveAutoBackupWithGoogleDriveResult> {
  const backupFileName = options?.backupFileName ?? 'moonrakers_auto_backup.json';
  const payload = createAutoBackupHybridPayload(data);

  const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!baseDir) {
    throw new Error('No writable directory found for auto backup.');
  }

  const fileUri = `${baseDir}${backupFileName}`;

  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  try {
    const accessToken = await getValidGoogleDriveAccessToken();

    if (!accessToken) {
      return {
        fileUri,
        driveResult: {
          ok: false,
          reason: options?.promptIfNeeded ? 'not-connected' : 'silent-not-connected',
          silent: !options?.promptIfNeeded,
        },
      };
    }

    const driveFile = await uploadLocalFileToGoogleDrive({
      accessToken,
      fileUri,
      fileName: backupFileName,
      mimeType: 'application/json',
    });

    return {
      fileUri,
      driveResult: {
        ok: true,
        fileId: driveFile.id,
        reason: GOOGLE_DRIVE_BACKUP_FOLDER_ID ? 'uploaded-to-folder' : 'uploaded-to-appdata',
      },
    };
  } catch (error) {
    console.error('Google Drive auto backup upload failed:', error);

    return {
      fileUri,
      driveResult: {
        ok: false,
        reason: 'upload-failed',
      },
    };
  }
}
