export type RememberedLogin = {
  email: string;
  password: string;
};

export type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export type SecureKeyValueStorage = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

type RememberedLoginDependencies = {
  storage?: KeyValueStorage;
  secureStorage?: SecureKeyValueStorage;
};

const REMEMBERED_LOGIN_EMAIL_KEY = "moonrakers:remembered-login-email";
const REMEMBERED_LOGIN_PASSWORD_KEY = "moonrakers.remembered-login-password";

const memoryStorageValues = new Map<string, string>();
const memorySecureStorageValues = new Map<string, string>();

function createMemoryStorage(): KeyValueStorage {
  return {
    async getItem(key) {
      return memoryStorageValues.get(key) ?? null;
    },
    async setItem(key, value) {
      memoryStorageValues.set(key, value);
    },
    async removeItem(key) {
      memoryStorageValues.delete(key);
    },
  };
}

function createMemorySecureStorage(): SecureKeyValueStorage {
  return {
    async getItemAsync(key) {
      return memorySecureStorageValues.get(key) ?? null;
    },
    async setItemAsync(key, value) {
      memorySecureStorageValues.set(key, value);
    },
    async deleteItemAsync(key) {
      memorySecureStorageValues.delete(key);
    },
  };
}

function getStorage(): KeyValueStorage {
  if (typeof navigator === "undefined" || navigator.product !== "ReactNative") {
    return createMemoryStorage();
  }

  try {
    const asyncStorageModule =
      require("@react-native-async-storage/async-storage") as typeof import("@react-native-async-storage/async-storage");
    return asyncStorageModule.default;
  } catch {
    return createMemoryStorage();
  }
}

function getSecureStorage(): SecureKeyValueStorage {
  if (typeof navigator === "undefined" || navigator.product !== "ReactNative") {
    return createMemorySecureStorage();
  }

  try {
    return require("expo-secure-store") as typeof import("expo-secure-store");
  } catch {
    return createMemorySecureStorage();
  }
}

function resolveDependencies(
  dependencies: RememberedLoginDependencies = {},
) {
  return {
    storage: dependencies.storage ?? getStorage(),
    secureStorage: dependencies.secureStorage ?? getSecureStorage(),
  };
}

export async function readRememberedLogin(
  dependencies: RememberedLoginDependencies = {},
): Promise<RememberedLogin | null> {
  const { storage, secureStorage } = resolveDependencies(dependencies);
  const email = (await storage.getItem(REMEMBERED_LOGIN_EMAIL_KEY))?.trim() ?? "";
  const password =
    (await secureStorage.getItemAsync(REMEMBERED_LOGIN_PASSWORD_KEY)) ?? "";

  if (!email || !password) {
    if (email) {
      await storage.removeItem(REMEMBERED_LOGIN_EMAIL_KEY);
    }

    if (password) {
      await secureStorage.deleteItemAsync(REMEMBERED_LOGIN_PASSWORD_KEY);
    }

    return null;
  }

  return {
    email,
    password,
  };
}

export async function writeRememberedLogin(
  login: RememberedLogin,
  dependencies: RememberedLoginDependencies = {},
) {
  const { storage, secureStorage } = resolveDependencies(dependencies);
  const normalizedEmail = login.email.trim();

  await storage.setItem(REMEMBERED_LOGIN_EMAIL_KEY, normalizedEmail);
  await secureStorage.setItemAsync(
    REMEMBERED_LOGIN_PASSWORD_KEY,
    login.password,
  );
}

export async function clearRememberedLogin(
  dependencies: RememberedLoginDependencies = {},
) {
  const { storage, secureStorage } = resolveDependencies(dependencies);

  await storage.removeItem(REMEMBERED_LOGIN_EMAIL_KEY);
  await secureStorage.deleteItemAsync(REMEMBERED_LOGIN_PASSWORD_KEY);
}
