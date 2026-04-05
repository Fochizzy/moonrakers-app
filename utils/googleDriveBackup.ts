export const MOONRAKERS_BACKUP_FOLDER_NAME = 'Moonrakers Backups';

type DriveFile = {
  id: string;
  name?: string;
  mimeType?: string;
  parents?: string[];
};

type EnsureFolderParams = {
  accessToken: string;
  folderName?: string;
};

type UploadLocalFileParams = {
  accessToken: string;
  fileUri: string;
  fileName: string;
  mimeType?: string;
  folderName?: string;
};

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API_BASE =
  'https://www.googleapis.com/upload/drive/v3/files';

async function parseDriveJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Google Drive request failed (${response.status}): ${text || 'No response body'}`
    );
  }

  return text ? (JSON.parse(text) as T) : ({} as T);
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function searchForFolder(
  accessToken: string,
  folderName: string
): Promise<DriveFile | null> {
  const q = [
    `name = '${escapeDriveQueryValue(folderName)}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    'trashed = false',
  ].join(' and ');

  const url = `${DRIVE_API_BASE}?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,parents)&orderBy=createdTime desc&pageSize=10`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await parseDriveJson<{ files?: DriveFile[] }>(response);
  return data.files?.[0] ?? null;
}

async function createFolder(
  accessToken: string,
  folderName: string
): Promise<DriveFile> {
  const response = await fetch(`${DRIVE_API_BASE}?fields=id,name,mimeType,parents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  return parseDriveJson<DriveFile>(response);
}

export async function ensureMoonrakersBackupFolder({
  accessToken,
  folderName = MOONRAKERS_BACKUP_FOLDER_NAME,
}: EnsureFolderParams): Promise<DriveFile> {
  const existingFolder = await searchForFolder(accessToken, folderName);
  if (existingFolder?.id) {
    return existingFolder;
  }

  return createFolder(accessToken, folderName);
}

async function searchForFileInFolder(
  accessToken: string,
  fileName: string,
  folderId: string
): Promise<DriveFile | null> {
  const q = [
    `name = '${escapeDriveQueryValue(fileName)}'`,
    `'${escapeDriveQueryValue(folderId)}' in parents`,
    'trashed = false',
  ].join(' and ');

  const url = `${DRIVE_API_BASE}?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,parents)&orderBy=modifiedTime desc&pageSize=10`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await parseDriveJson<{ files?: DriveFile[] }>(response);
  return data.files?.[0] ?? null;
}

async function readFileAsBlob(fileUri: string, mimeType: string): Promise<Blob> {
  const fileResponse = await fetch(fileUri);
  if (!fileResponse.ok) {
    throw new Error(`Unable to read local file: ${fileUri}`);
  }

  const sourceBlob = await fileResponse.blob();
  return sourceBlob.slice(0, sourceBlob.size, mimeType);
}

function buildMultipartBody(metadata: Record<string, unknown>, fileBlob: Blob): Blob {
  const boundary = `moonrakers-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const delimiter = `--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body = new Blob([
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    JSON.stringify(metadata),
    '\r\n',
    delimiter,
    `Content-Type: ${fileBlob.type || 'application/octet-stream'}\r\n\r\n`,
    fileBlob,
    closeDelimiter,
  ]);

  Object.defineProperty(body, 'contentType', {
    value: `multipart/related; boundary=${boundary}`,
    enumerable: false,
  });

  return body;
}

export async function uploadLocalFileToGoogleDrive({
  accessToken,
  fileUri,
  fileName,
  mimeType = 'application/json',
  folderName = MOONRAKERS_BACKUP_FOLDER_NAME,
}: UploadLocalFileParams): Promise<DriveFile> {
  const folder = await ensureMoonrakersBackupFolder({ accessToken, folderName });

  if (!folder?.id) {
    throw new Error('Moonrakers backup folder could not be created or found.');
  }

  const existingFile = await searchForFileInFolder(accessToken, fileName, folder.id);
  const fileBlob = await readFileAsBlob(fileUri, mimeType);

  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType,
  };

  if (!existingFile?.id) {
    metadata.parents = [folder.id];
  }

  const multipartBody = buildMultipartBody(metadata, fileBlob) as Blob & {
    contentType?: string;
  };

  const url = existingFile?.id
    ? `${DRIVE_UPLOAD_API_BASE}/${existingFile.id}?uploadType=multipart&fields=id,name,mimeType,parents`
    : `${DRIVE_UPLOAD_API_BASE}?uploadType=multipart&fields=id,name,mimeType,parents`;

  const response = await fetch(url, {
    method: existingFile?.id ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': multipartBody.contentType ?? 'multipart/related',
    },
    body: multipartBody,
  });

  const uploaded = await parseDriveJson<DriveFile>(response);

  if (!uploaded?.id) {
    throw new Error('Drive upload finished but no file ID was returned.');
  }

  return uploaded;
}
