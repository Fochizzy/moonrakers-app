import assert from "node:assert/strict";

import {
  clearRememberedLogin,
  readRememberedLogin,
  writeRememberedLogin,
  type KeyValueStorage,
} from "../lib/auth/rememberedLogin.ts";

function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();

  return {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
  };
}

function createMemorySecureStorage() {
  const values = new Map<string, string>();

  return {
    values,
    async getItemAsync(key) {
      return values.get(key) ?? null;
    },
    async setItemAsync(key, value) {
      values.set(key, value);
    },
    async deleteItemAsync(key) {
      values.delete(key);
    },
  };
}

const storage = createMemoryStorage();
const secureStorage = createMemorySecureStorage();

assert.equal(
  await readRememberedLogin({
    storage,
    secureStorage,
  }),
  null,
);

await writeRememberedLogin(
  {
    email: "  admiral@moonrakers.app  ",
    password: "starsecret",
  },
  {
    storage,
    secureStorage,
  },
);

assert.deepEqual(
  Array.from(secureStorage.values.keys()),
  ["moonrakers.remembered-login-password"],
);

assert.deepEqual(
  await readRememberedLogin({
    storage,
    secureStorage,
  }),
  {
    email: "admiral@moonrakers.app",
    password: "starsecret",
  },
);

assert.equal(
  Array.from(secureStorage.values.keys()).some((key) => key.includes(":")),
  false,
);

await clearRememberedLogin({
  storage,
  secureStorage,
});

assert.equal(
  await readRememberedLogin({
    storage,
    secureStorage,
  }),
  null,
);

console.log("remembered-login.test.ts passed");
