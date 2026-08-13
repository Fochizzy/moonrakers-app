import { load, remove, save, transaction } from "@/utils/storage/storage";
import type { StoredSettings } from "@/utils/storage/storageKeys";

export type CachedSnapshot = {
  players: unknown[];
  groups: unknown[];
  games: unknown[];
};

export type SaveCachedSnapshotInput = CachedSnapshot & {
  profileId: string;
};

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeId(value: unknown) {
  return String(value ?? "").trim();
}

function isEmptySnapshot(snapshot: CachedSnapshot) {
  return (
    snapshot.players.length === 0 &&
    snapshot.groups.length === 0 &&
    snapshot.games.length === 0
  );
}

/**
 * Reads the cached shared state written by the last session of this profile.
 *
 * The store is in-memory only, so without this a cold start has no players,
 * groups, or games until the cloud snapshot lands — long enough that
 * server-authored links (a profile's recent games, say) resolve to nothing.
 *
 * Returns null when there is no cache, when it is empty, or when it belongs to
 * a different profile.
 */
export async function loadCachedSnapshot(
  profileId: string,
): Promise<CachedSnapshot | null> {
  const normalizedProfileId = normalizeId(profileId);
  if (!normalizedProfileId) return null;

  try {
    const [settings, players, groups, games] = await Promise.all([
      load("settings", null),
      load("players", []),
      load("groups", []),
      load("games", []),
    ]);

    const owner = normalizeId((settings as StoredSettings | null)?.snapshotProfileId);
    if (owner !== normalizedProfileId) {
      return null;
    }

    const snapshot: CachedSnapshot = {
      players: toArray(players),
      groups: toArray(groups),
      games: toArray(games),
    };

    return isEmptySnapshot(snapshot) ? null : snapshot;
  } catch {
    return null;
  }
}

/** Writes the shared state so the next cold start has something to show. */
export async function saveCachedSnapshot(
  input: SaveCachedSnapshotInput,
): Promise<boolean> {
  const normalizedProfileId = normalizeId(input.profileId);
  if (!normalizedProfileId) return false;

  try {
    const settings = ((await load("settings", null)) ?? {}) as StoredSettings;

    return await transaction({
      players: toArray(input.players) as never,
      groups: toArray(input.groups) as never,
      games: toArray(input.games) as never,
      settings: {
        ...settings,
        snapshotProfileId: normalizedProfileId,
        snapshotSavedAt: Date.now(),
      },
    });
  } catch {
    return false;
  }
}

/** Drops the cache and its ownership marker, e.g. on sign-out. */
export async function clearCachedSnapshot(): Promise<boolean> {
  try {
    const settings = ((await load("settings", null)) ?? {}) as StoredSettings;
    const remaining: StoredSettings = { ...settings };
    delete remaining.snapshotProfileId;
    delete remaining.snapshotSavedAt;

    await Promise.all([remove("players"), remove("groups"), remove("games")]);
    await save("settings", remaining);

    return true;
  } catch {
    return false;
  }
}

const SNAPSHOT_CACHE_WRITE_DELAY_MS = 400;

type SnapshotCacheStore = {
  getState: () => {
    players?: unknown;
    groups?: unknown;
    games?: unknown;
    authSession?: { user?: { id?: string | null } | null } | null;
  };
  subscribe: (listener: () => void) => () => void;
};

/**
 * Mirrors the shared collections into the cache whenever they change.
 *
 * Subscribing to the store rather than writing from each call site means every
 * path that changes shared state — cloud hydration, a realtime refresh, a game
 * finished on device, a CSV import — keeps the cache current for free.
 *
 * Writes are debounced and skipped while signed out, so a signed-out session
 * never seeds a cache and a burst of updates costs one write.
 */
export function startSnapshotCachePersistence(store: SnapshotCacheStore) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastPlayers: unknown = store.getState().players;
  let lastGroups: unknown = store.getState().groups;
  let lastGames: unknown = store.getState().games;

  function flush() {
    timer = null;

    const state = store.getState();
    const profileId = normalizeId(state.authSession?.user?.id);
    if (!profileId) return;

    void saveCachedSnapshot({
      profileId,
      players: toArray(state.players),
      groups: toArray(state.groups),
      games: toArray(state.games),
    });
  }

  const unsubscribe = store.subscribe(() => {
    const state = store.getState();

    if (
      state.players === lastPlayers &&
      state.groups === lastGroups &&
      state.games === lastGames
    ) {
      return;
    }

    lastPlayers = state.players;
    lastGroups = state.groups;
    lastGames = state.games;

    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, SNAPSHOT_CACHE_WRITE_DELAY_MS);
  });

  return () => {
    if (timer) clearTimeout(timer);
    timer = null;
    unsubscribe();
  };
}

export default loadCachedSnapshot;
