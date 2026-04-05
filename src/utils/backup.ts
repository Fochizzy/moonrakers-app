export function exportBackup(data: any) {
  return JSON.stringify(data);
}

export function importBackup(json: string) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
