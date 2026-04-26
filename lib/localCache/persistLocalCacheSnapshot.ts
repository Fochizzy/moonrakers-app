type LocalCacheSnapshot = {
  players: unknown[];
  groups: unknown[];
  games: unknown[];
};

type PersistLocalCacheSnapshotDeps = {
  writeEntries?: (entries: LocalCacheSnapshot) => Promise<boolean>;
};

function toArray(value: unknown) {
  return Array.isArray(value) ? [...value] : [];
}

function normalizeSnapshot(snapshot: Partial<LocalCacheSnapshot> | null | undefined): LocalCacheSnapshot {
  return {
    players: toArray(snapshot?.players),
    groups: toArray(snapshot?.groups),
    games: toArray(snapshot?.games),
  };
}

export async function persistLocalCacheSnapshot(
  snapshot: Partial<LocalCacheSnapshot> | null | undefined,
  deps: PersistLocalCacheSnapshotDeps = {},
) {
  const normalizedSnapshot = normalizeSnapshot(snapshot);
  const writeEntries =
    deps.writeEntries ??
    (async (entries: LocalCacheSnapshot) => {
      const { transaction } = await import("../../utils/storage/storage");
      return transaction(entries as any);
    });

  return writeEntries(normalizedSnapshot);
}
