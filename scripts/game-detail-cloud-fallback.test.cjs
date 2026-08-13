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

// Stub the Supabase client before loadCloudGameById pulls it in: the real
// module needs runtime config that a node test has no business providing.
const queries = [];
let nextRow = null;
let nextError = null;

function createQueryBuilder() {
  const record = { table: null, filters: {}, single: false };
  queries.push(record);

  const builder = {
    select() {
      return builder;
    },
    eq(column, value) {
      record.filters[column] = value;
      return builder;
    },
    async maybeSingle() {
      record.single = true;
      return { data: nextRow, error: nextError };
    },
    __record: record,
  };

  return builder;
}

const supabasePath = path.join(projectRoot, "lib", "supabase.ts");
require.cache[supabasePath] = {
  id: supabasePath,
  filename: supabasePath,
  loaded: true,
  exports: {
    supabase: {
      from(table) {
        const builder = createQueryBuilder();
        builder.__record.table = table;
        return builder;
      },
    },
  },
};

const { loadCloudGameById } = require("../lib/cloud/loadCloudGameById.ts");

async function run() {
  // A local (non-uuid) id must never reach the database: games.id is a uuid
  // column, so querying with one is a server-side type error.
  for (const localId of [
    "1755102000000-a1b2c3",
    "",
    "   ",
    "not-a-uuid",
    undefined,
    null,
  ]) {
    const result = await loadCloudGameById(localId);
    assert.equal(
      result,
      null,
      `expected a non-uuid id (${String(localId)}) to resolve to null`,
    );
  }

  assert.equal(
    queries.length,
    0,
    "expected non-uuid ids to be rejected before any query is issued",
  );

  // A cloud id fetches exactly that one finished game and normalizes it.
  const gameId = "7f3f5db1-daa0-4e60-ae13-c532e60f3ced";
  nextRow = {
    id: gameId,
    host_profile_id: "ff4d1f2b-5b12-4b38-90a6-469257356d7e",
    created_at: "2026-08-13T18:23:01.120Z",
    winner_profile_id: "ff4d1f2b-5b12-4b38-90a6-469257356d7e",
    game_participants: [
      {
        id: "participant-1",
        profile_id: "ff4d1f2b-5b12-4b38-90a6-469257356d7e",
        player_name_snapshot: "Izzy",
        start_order: 0,
        total_prestige: 12,
        direct_prestige: 9,
        assist_prestige_received: 3,
        score: 20,
        is_winner: true,
      },
      {
        id: "participant-2",
        profile_id: "1bfad68a-e8aa-4b5b-ae59-bfbffcc5e2b8",
        player_name_snapshot: "Greg",
        start_order: 1,
        total_prestige: 8,
        direct_prestige: 8,
        score: 13,
        is_winner: false,
      },
    ],
    game_rounds: [
      {
        participant_id: "participant-1",
        round_index: 0,
        prestige: 4,
        contracts: 1,
        assist_recipients: { "1bfad68a-e8aa-4b5b-ae59-bfbffcc5e2b8": 1 },
        assist_prestige_recipients: {
          "1bfad68a-e8aa-4b5b-ae59-bfbffcc5e2b8": 2,
        },
      },
    ],
  };

  const game = await loadCloudGameById(gameId);

  assert.equal(queries.length, 1, "expected exactly one query for a cloud id");
  assert.equal(queries[0].table, "games");
  assert.deepEqual(
    queries[0].filters,
    { id: gameId, status: "finished" },
    "expected the fetch to be scoped to that single finished game",
  );
  assert.equal(queries[0].single, true, "expected a single-row fetch");

  assert.equal(game.id, gameId, "expected the normalized game to keep its id");
  assert.equal(
    game.players.length,
    2,
    "expected participants to normalize into local players",
  );
  assert.equal(
    game.rounds.length,
    1,
    "expected rounds to normalize with the game",
  );
  assert.equal(
    game.rounds[0].playerId,
    "ff4d1f2b-5b12-4b38-90a6-469257356d7e",
    "expected round participants to map back to profile ids",
  );
  assert.deepEqual(
    game.rounds[0].assistPrestigeRecipients,
    { "1bfad68a-e8aa-4b5b-ae59-bfbffcc5e2b8": 2 },
    "expected assist attribution to survive the cloud fetch",
  );

  // Whitespace around a routed id must not break the lookup.
  await loadCloudGameById(`  ${gameId}  `);
  assert.equal(
    queries[1].filters.id,
    gameId,
    "expected the id to be trimmed before querying",
  );

  // A game that is not readable resolves to null rather than throwing.
  nextRow = null;
  assert.equal(
    await loadCloudGameById(gameId),
    null,
    "expected a missing row to resolve to null",
  );

  // A transport error propagates so the caller can fall back to "not found".
  nextError = new Error("network down");
  await assert.rejects(
    () => loadCloudGameById(gameId),
    /network down/,
    "expected query errors to surface to the caller",
  );
  nextError = null;
}

run().then(() => {
  const hookSource = fs.readFileSync(
    path.join(projectRoot, "lib", "cloud", "useResolvedGame.ts"),
    "utf8",
  );
  const summarySource = fs.readFileSync(
    path.join(projectRoot, "app", "summary.tsx"),
    "utf8",
  );
  const trendsSource = fs.readFileSync(
    path.join(projectRoot, "app", "game-trends.tsx"),
    "utf8",
  );

  assert.match(
    hookSource,
    /loadCloudGameById\(normalizedGameId\)/,
    "expected the resolver to fall back to the cloud when the store misses",
  );

  assert.match(
    hookSource,
    /if \(storeGame\) \{\s*return \{ game: storeGame as T, status: "ready", fromCloud: false \};/,
    "expected a store hit to short-circuit before any fetch",
  );

  assert.match(
    hookSource,
    /status: cloudStatus === "done" \? "missing" : "loading"/,
    "expected an in-flight fetch to report loading rather than missing",
  );

  for (const [label, source] of [
    ["summary", summarySource],
    ["game-trends", trendsSource],
  ]) {
    assert.match(
      source,
      /useResolvedGame</,
      `expected the ${label} screen to resolve its game through the shared resolver`,
    );

    assert.doesNotMatch(
      source,
      /games\.find\(/,
      `expected the ${label} screen to stop resolving games from the store alone`,
    );

    assert.match(
      source,
      /resolvedGame\.status === "loading"/,
      `expected the ${label} screen to distinguish loading from not found`,
    );
  }

  assert.match(
    summarySource,
    /const routeGameId = Array\.isArray\(params\?\.gameId\)/,
    "expected the summary screen to tolerate an array-valued gameId param",
  );

  console.log("game-detail-cloud-fallback.test.cjs passed");
});
