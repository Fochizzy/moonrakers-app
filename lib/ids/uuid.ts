declare const require:
  | undefined
  | ((moduleName: string) => { randomUUID?: () => string });

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatUuidFromBytes(bytes: number[], version: number) {
  const normalized = bytes.slice(0, 16);
  normalized[6] = (normalized[6] & 0x0f) | (version << 4);
  normalized[8] = (normalized[8] & 0x3f) | 0x80;

  const hex = normalized
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function buildManualUuid() {
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  return formatUuidFromBytes(bytes, 4);
}

// Four FNV-1a streams with distinct offset bases fill four bytes apiece, so the
// whole 128-bit space is covered by a pure function of the seed.
const SEED_HASH_BASES = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b];

function hashSeedToBytes(seed: string) {
  const bytes = new Array<number>(16).fill(0);

  SEED_HASH_BASES.forEach((base, streamIndex) => {
    let hash = base >>> 0;

    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }

    for (let byteIndex = 0; byteIndex < 4; byteIndex += 1) {
      bytes[streamIndex * 4 + byteIndex] = (hash >>> (byteIndex * 8)) & 0xff;
    }
  });

  return bytes;
}

function loadExpoUuid() {
  if (typeof require !== "function") {
    return null;
  }

  try {
    const expoCrypto = require("expo-crypto");
    const uuid = expoCrypto?.randomUUID?.();
    return isUuid(uuid) ? uuid : null;
  } catch {
    return null;
  }
}

export function coerceUuid(value: unknown) {
  const normalized = String(value ?? "").trim();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

export function isUuid(value: unknown): value is string {
  return coerceUuid(value) !== null;
}

export function createUuid() {
  const globalUuid = globalThis.crypto?.randomUUID?.();
  if (isUuid(globalUuid)) {
    return globalUuid;
  }

  const expoUuid = loadExpoUuid();
  if (expoUuid) {
    return expoUuid;
  }

  return buildManualUuid();
}

export function resolveUuid(value: unknown) {
  return coerceUuid(value) ?? createUuid();
}

/**
 * Deterministic name-based UUID: the same namespace + seed always resolves to
 * the same id, so callers can upgrade a legacy id without minting a new one
 * every time they run.
 */
export function deriveUuid(namespace: string, seed: unknown) {
  const normalized = String(seed ?? "").trim();
  if (!normalized) {
    return null;
  }

  return formatUuidFromBytes(hashSeedToBytes(`${namespace}:${normalized}`), 5);
}

/**
 * Like resolveUuid, but stable for non-UUID input. Only falls back to a random
 * id when there is no seed to derive from.
 */
export function resolveStableUuid(namespace: string, value: unknown) {
  return coerceUuid(value) ?? deriveUuid(namespace, value) ?? createUuid();
}
