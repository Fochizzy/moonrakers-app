export type PendingAuthIntent = "recovery-ready";

type IntentStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const STORAGE_KEY = "moonrakers:pending-auth-intent";

let memoryIntent: string | null = null;

function getMemoryStorage(): IntentStorage {
  return {
    async getItem() {
      return memoryIntent;
    },
    async setItem(_key, value) {
      memoryIntent = value;
    },
    async removeItem() {
      memoryIntent = null;
    },
  };
}

function getIntentStorage(): IntentStorage {
  if (typeof navigator === "undefined" || navigator.product !== "ReactNative") {
    return getMemoryStorage();
  }

  try {
    const asyncStorageModule =
      require("@react-native-async-storage/async-storage") as typeof import("@react-native-async-storage/async-storage");
    return asyncStorageModule.default;
  } catch {
    return getMemoryStorage();
  }
}

export function normalizePendingAuthIntent(
  value: string | null,
): PendingAuthIntent | null {
  return value === "recovery-ready" ? value : null;
}

export async function readPendingAuthIntent(): Promise<PendingAuthIntent | null> {
  const storage = getIntentStorage();
  const value = await storage.getItem(STORAGE_KEY);
  const normalized = normalizePendingAuthIntent(value);

  // Clear legacy or invalid values so stale recovery state cannot hijack startup.
  if (value !== null && normalized === null) {
    await storage.removeItem(STORAGE_KEY);
  }

  return normalized;
}

export async function writePendingAuthIntent(intent: PendingAuthIntent) {
  const storage = getIntentStorage();
  await storage.setItem(STORAGE_KEY, intent);
}

export async function clearPendingAuthIntent() {
  const storage = getIntentStorage();
  await storage.removeItem(STORAGE_KEY);
}
