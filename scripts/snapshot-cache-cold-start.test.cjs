const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function patchedResolveFilename(
  request,
  parent,
  isMain,
  options,
) {
  if (request.startsWith("@/")) {
    request = path.join(projectRoot, request.slice(2));
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(mod, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        allowJs: true,
      },
      fileName: filename,
    });

    mod._compile(outputText, filename);
  };
}

// In-memory stand-in for AsyncStorage, injected before the storage layer loads.
const disk = new Map();
const asyncStoragePath = require.resolve(
  "@react-native-async-storage/async-storage",
);

require.cache[asyncStoragePath] = {
  id: asyncStoragePath,
  filename: asyncStoragePath,
  loaded: true,
  exports: {
    // The storage layer is transpiled with esModuleInterop, so the stub has to
    // look like a real ES module or the default import gets double-wrapped.
    __esModule: true,
    default: {
      async getItem(key) {
        return disk.has(key) ? disk.get(key) : null;
      },
      async setItem(key, value) {
        disk.set(key, value);
      },
      async removeItem(key) {
        disk.delete(key);
      },
      async multiSet(entries) {
        for (const [key, value] of entries) disk.set(key, value);
      },
      async multiGet(keys) {
        return keys.map((key) => [key, disk.has(key) ? disk.get(key) : null]);
      },
      async multiRemove(keys) {
        for (const key of keys) disk.delete(key);
      },
    },
  },
};

const {
  clearCachedSnapshot,
  loadCachedSnapshot,
  saveCachedSnapshot,
  startSnapshotCachePersistence,
} = require("../lib/cloud/snapshotCache.ts");
const { clearCache } = require("../utils/storage/storage.ts");

const PROFILE_A = "ff4d1f2b-5b12-4b38-90a6-469257356d7e";
const PROFILE_B = "1bfad68a-e8aa-4b5b-ae59-bfbffcc5e2b8";

const players = [{ id: PROFILE_A, name: "Izzy" }];
const groups = [{ id: "group-1", name: "Crew", playerIds: [PROFILE_A] }];
const games = [
  { id: "7f3f5db1-daa0-4e60-ae13-c532e60f3ced", createdAt: 1, players },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  // Nothing cached yet.
  assert.equal(
    await loadCachedSnapshot(PROFILE_A),
    null,
    "expected an empty device to report no cached snapshot",
  );

  assert.equal(
    await saveCachedSnapshot({ profileId: "", players, groups, games }),
    false,
    "expected a save without a profile id to be refused",
  );

  // A round trip returns what the last session saw.
  assert.equal(
    await saveCachedSnapshot({ profileId: PROFILE_A, players, groups, games }),
    true,
  );

  clearCache();
  const restored = await loadCachedSnapshot(PROFILE_A);
  assert.deepEqual(
    restored,
    { players, groups, games },
    "expected the cached snapshot to survive a cold start",
  );

  // The cache is owned by one profile: another account must not read it.
  clearCache();
  assert.equal(
    await loadCachedSnapshot(PROFILE_B),
    null,
    "expected a different profile to be denied the cached snapshot",
  );

  assert.equal(
    await loadCachedSnapshot(""),
    null,
    "expected a signed-out read to be denied",
  );

  // Sign-out drops it.
  assert.equal(await clearCachedSnapshot(), true);
  clearCache();
  assert.equal(
    await loadCachedSnapshot(PROFILE_A),
    null,
    "expected sign-out to drop the cached snapshot",
  );

  // An all-empty snapshot is not worth restoring.
  await saveCachedSnapshot({
    profileId: PROFILE_A,
    players: [],
    groups: [],
    games: [],
  });
  clearCache();
  assert.equal(
    await loadCachedSnapshot(PROFILE_A),
    null,
    "expected an empty cached snapshot to be treated as no cache",
  );

  // --- Store subscription keeps the cache current ---
  await clearCachedSnapshot();
  clearCache();

  const listeners = new Set();
  let state = {
    players: [],
    groups: [],
    games: [],
    authSession: { user: { id: PROFILE_A } },
  };

  const fakeStore = {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  function setState(next) {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  }

  const stop = startSnapshotCachePersistence(fakeStore);

  setState({ players, groups, games });
  await sleep(600);

  clearCache();
  assert.deepEqual(
    await loadCachedSnapshot(PROFILE_A),
    { players, groups, games },
    "expected a store change to be mirrored into the cache",
  );

  // A burst of updates costs one write, and the last value wins.
  const secondGame = { id: "second-game", createdAt: 2, players };
  setState({ games: [...games, secondGame] });
  setState({ games: [secondGame] });
  await sleep(600);

  clearCache();
  const afterBurst = await loadCachedSnapshot(PROFILE_A);
  assert.deepEqual(
    afterBurst.games,
    [secondGame],
    "expected debounced writes to persist the latest state",
  );

  // Signed out, the store must not seed a cache.
  await clearCachedSnapshot();
  clearCache();
  setState({ authSession: null, games: [secondGame, ...games] });
  await sleep(600);

  clearCache();
  assert.equal(
    await loadCachedSnapshot(PROFILE_A),
    null,
    "expected a signed-out store to write nothing",
  );

  stop();

  // After tearing down, further changes are ignored.
  setState({ authSession: { user: { id: PROFILE_A } }, games });
  await sleep(600);
  clearCache();
  assert.equal(
    await loadCachedSnapshot(PROFILE_A),
    null,
    "expected an unsubscribed persister to stop writing",
  );
}

run().then(() => {
  const bootstrapSource = fs.readFileSync(
    path.join(projectRoot, "lib", "auth", "useSharedCloudBootstrap.ts"),
    "utf8",
  );
  const storeSource = fs.readFileSync(
    path.join(projectRoot, "store", "useStore.ts"),
    "utf8",
  );

  assert.match(
    bootstrapSource,
    /useEffect\(\(\) => startSnapshotCachePersistence\(useStore\), \[\]\)/,
    "expected the bootstrap to keep the cache in step with the store",
  );

  assert.match(
    bootstrapSource,
    /const cachedSnapshot = await loadCachedSnapshot\(session\.user\.id\)/,
    "expected the bootstrap to seed shared state from the cache before the cloud load",
  );

  assert.match(
    bootstrapSource,
    /if \(cachedSnapshot && !cloudHydratedRef\.current\) \{\s*hydrateCachedSnapshot\(cachedSnapshot\);/,
    "expected a landed cloud snapshot to win over a later cache read",
  );

  assert.match(
    bootstrapSource,
    /hydrateCloudSnapshot\(hydratedSnapshot\);\s*cloudHydratedRef\.current = true;/,
    "expected cloud hydration to mark the store as authoritative",
  );

  const signOutClears = bootstrapSource.match(/await clearCachedSnapshot\(\)/g) ?? [];
  assert.equal(
    signOutClears.length,
    2,
    "expected both the no-session bootstrap and the explicit sign-out to drop the cache",
  );

  const actionStart = storeSource.indexOf(
    "hydrateCachedSnapshot: ({ players, groups, games }) =>",
  );
  assert.notEqual(
    actionStart,
    -1,
    "expected the store to expose a cache hydration action",
  );

  const actionBody = storeSource.slice(
    actionStart,
    storeSource.indexOf("clearAuthState:", actionStart),
  );

  assert.match(
    actionBody,
    /sanitizeSnapshotState\(\{ players, groups, games \}\)/,
    "expected cached state to go through the same sanitizer as cloud state",
  );

  assert.doesNotMatch(
    actionBody,
    /authSession|authProfile|authBootstrapStatus/,
    "expected cache hydration to leave auth state alone",
  );

  console.log("snapshot-cache-cold-start.test.cjs passed");
});
