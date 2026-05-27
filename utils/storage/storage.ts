// storage.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, type StorageSchema, type StorageKey } from './storageKeys';

const STORAGE_VERSION = 2;

type StoredValue<T> = {
  value: T;
  expiresAt?: number;
  version: number;
};

type Options = {
  ttl?: number;
};

type Serializer = {
  stringify: (v: unknown) => string;
  parse: (v: string) => unknown;
};

type Listener<T = unknown> = (value: T | null) => void;

let serializer: Serializer = {
  stringify: JSON.stringify,
  parse: JSON.parse,
};

export function setSerializer(next: Partial<Serializer>) {
  serializer = { ...serializer, ...next };
}

const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Map<string, Set<Listener>>();

const STORAGE_KEY_BY_SCHEMA_KEY: {
  [K in keyof StorageSchema]: StorageKey;
} = {
  players: STORAGE_KEYS.PLAYERS,
  games: STORAGE_KEYS.GAMES,
  groups: STORAGE_KEYS.GROUPS,
  settings: STORAGE_KEYS.SETTINGS,
  gameDraft: STORAGE_KEYS.GAME_DRAFT,
};

function getStorageKey<K extends keyof StorageSchema>(key: K): StorageKey {
  return STORAGE_KEY_BY_SCHEMA_KEY[key];
}

function emit(key: string, value: unknown) {
  listeners.get(key)?.forEach((cb) => cb(value));
}

function wrap<T>(value: T, ttl?: number): StoredValue<T> {
  return {
    value,
    version: STORAGE_VERSION,
    expiresAt: ttl ? Date.now() + ttl : undefined,
  };
}

function unwrap<T>(data: StoredValue<T> | null): T | null {
  if (!data) return null;

  if (typeof data.expiresAt === 'number' && Date.now() > data.expiresAt) {
    return null;
  }

  return data.value;
}

function safeParse<T>(raw: string | null): StoredValue<T> | null {
  if (!raw) return null;

  try {
    return serializer.parse(raw) as StoredValue<T>;
  } catch {
    return null;
  }
}

type Migration = (data: unknown) => unknown;

const MIGRATIONS: Record<number, Migration> = {
  1: (value) => {
    if (!value || typeof value !== 'object') return value;

    if (Array.isArray(value)) return value;

    return value;
  },
  2: (value) => {
    if (Array.isArray(value)) return value;
    return value;
  },
};

function migrate<T>(data: StoredValue<T>): StoredValue<T> {
  const startVersion =
    typeof data.version === 'number' && Number.isFinite(data.version)
      ? data.version
      : 1;

  let current: StoredValue<unknown> = {
    ...data,
    version: startVersion,
  };

  for (let version = startVersion; version < STORAGE_VERSION; version += 1) {
    const fn = MIGRATIONS[version + 1];
    if (fn) {
      current = {
        ...current,
        value: fn(current.value),
        version: version + 1,
      };
    }
  }

  return current as StoredValue<T>;
}

export function subscribe<K extends keyof StorageSchema, S = StorageSchema[K]>(
  key: K,
  selector: (value: StorageSchema[K] | null) => S = (v) => v as unknown as S,
  callback: (slice: S) => void,
  isEqual: (a: S, b: S) => boolean = Object.is
) {
  const storageKey = getStorageKey(key);

  if (!listeners.has(storageKey)) {
    listeners.set(storageKey, new Set());
  }

  let prev: S | undefined;

  const wrapped: Listener = (value) => {
    const next = selector(value as StorageSchema[K] | null);

    if (prev !== undefined && isEqual(prev, next)) {
      return;
    }

    prev = next;
    callback(next);
  };

  listeners.get(storageKey)!.add(wrapped);

  return () => {
    listeners.get(storageKey)?.delete(wrapped);
  };
}

export async function save<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K],
  opts?: Options
): Promise<boolean> {
  const storageKey = getStorageKey(key);

  try {
    const wrapped = wrap(value, opts?.ttl);
    const serialized = serializer.stringify(wrapped);

    await AsyncStorage.setItem(storageKey, serialized);

    cache.set(storageKey, value);
    emit(storageKey, value);

    return true;
  } catch (error) {
    console.error(`save(${String(key)}) failed:`, error);
    return false;
  }
}

export async function load<K extends keyof StorageSchema>(
  key: K,
  fallback: StorageSchema[K] | null = null
): Promise<StorageSchema[K] | null> {
  const storageKey = getStorageKey(key);

  if (cache.has(storageKey)) {
    return cache.get(storageKey) as StorageSchema[K] | null;
  }

  if (inflight.has(storageKey)) {
    return inflight.get(storageKey) as Promise<StorageSchema[K] | null>;
  }

  const promise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      let parsed = safeParse<StorageSchema[K]>(raw);

      if (!parsed) return fallback;

      parsed = migrate(parsed);

      const value = unwrap(parsed);

      if (value === null) {
        await AsyncStorage.removeItem(storageKey);
        cache.delete(storageKey);
        return fallback;
      }

      cache.set(storageKey, value);
      return value;
    } catch (error) {
      console.error(`load(${String(key)}) failed:`, error);
      return fallback;
    }
  })();

  inflight.set(storageKey, promise);

  try {
    return await promise;
  } finally {
    inflight.delete(storageKey);
  }
}

export async function remove<K extends keyof StorageSchema>(
  key: K
): Promise<boolean> {
  const storageKey = getStorageKey(key);

  try {
    await AsyncStorage.removeItem(storageKey);
    cache.delete(storageKey);
    emit(storageKey, null);
    return true;
  } catch (error) {
    console.error(`remove(${String(key)}) failed:`, error);
    return false;
  }
}

export async function transaction(
  entries: Partial<StorageSchema>,
  opts?: Options
): Promise<boolean> {
  try {
    const batch: [string, string][] = [];

    for (const [key, value] of Object.entries(entries) as [
      keyof StorageSchema,
      StorageSchema[keyof StorageSchema]
    ][]) {
      const storageKey = getStorageKey(key);

      const wrapped = wrap(value, opts?.ttl);
      batch.push([storageKey, serializer.stringify(wrapped)]);
    }

    await AsyncStorage.multiSet(batch);

    for (const [key, value] of Object.entries(entries) as [
      keyof StorageSchema,
      StorageSchema[keyof StorageSchema]
    ][]) {
      const storageKey = getStorageKey(key);

      cache.set(storageKey, value);
      emit(storageKey, value);
    }

    return true;
  } catch (error) {
    console.error('transaction failed:', error);
    return false;
  }
}

export async function cleanup(keys: (keyof StorageSchema)[]) {
  const storageKeys = keys.map((key) => getStorageKey(key));

  const result = await AsyncStorage.multiGet(storageKeys);
  const removals: string[] = [];

  for (const [storageKey, raw] of result) {
    const parsed = safeParse(raw);

    if (!parsed) continue;

    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      removals.push(storageKey);
      cache.delete(storageKey);
      emit(storageKey, null);
    }
  }

  if (removals.length > 0) {
    await AsyncStorage.multiRemove(removals);
  }
}

export function clearCache() {
  cache.clear();
}

export function preload<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K]
) {
  const storageKey = getStorageKey(key);
  cache.set(storageKey, value);
}

export async function loadPlayers() {
  return load('players', []);
}

export async function savePlayers(players: StorageSchema['players']) {
  return save('players', players);
}

export async function loadGames() {
  return load('games', []);
}

export async function saveGames(games: StorageSchema['games']) {
  return save('games', games);
}

export async function loadGroups() {
  return load('groups', []);
}

export async function saveGroups(groups: StorageSchema['groups']) {
  return save('groups', groups);
}
