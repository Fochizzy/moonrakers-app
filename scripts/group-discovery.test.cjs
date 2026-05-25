const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { stripTypeScriptTypes } = require("node:module");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

function loadHelperModule() {
  let source = read(path.join("utils", "groupUsageRanking.ts"));

  source = source.replace(
    /export\s+type\s+GroupSortMode\s*=\s*"most-played"\s*\|\s*"recent"\s*\|\s*"az";?/,
    ""
  );
  source = source.replace(/export\s+function\s+/g, "function ");

  const executableSource = `${stripTypeScriptTypes(source, { mode: "strip" })}
module.exports = {
  rankGroupsWithUsage,
  filterGroupsByQuery,
  formatGroupUsageHint,
};`;

  const module = { exports: {} };
  const context = vm.createContext({
    module,
    exports: module.exports,
    require,
    console,
    Date,
    Map,
    Set,
    Math,
    Number,
    String,
    Array,
    Object,
  });

  new vm.Script(executableSource, {
    filename: "groupUsageRanking.runtime.js",
  }).runInContext(context);

  return module.exports;
}

const helperSource = read(path.join("utils", "groupUsageRanking.ts"));
const addPlayersSource = read(path.join("app", "add-players.tsx"));
const homeSource = read(path.join("app", "index.tsx"));
const {
  rankGroupsWithUsage,
  filterGroupsByQuery,
  formatGroupUsageHint,
} = loadHelperModule();

assert.match(
  helperSource,
  /export\s+type\s+GroupSortMode\s*=\s*\"most-played\"\s*\|\s*\"recent\"\s*\|\s*\"az\"/,
  "expected utils/groupUsageRanking.ts to export GroupSortMode with the saved-group sort modes"
);

assert.match(
  helperSource,
  /export\s+function\s+rankGroupsWithUsage(?:<[\s\S]*?>)?\s*\(/,
  "expected utils/groupUsageRanking.ts to export rankGroupsWithUsage("
);

assert.match(
  helperSource,
  /export\s+function\s+filterGroupsByQuery(?:<[\s\S]*?>)?\s*\(/,
  "expected utils/groupUsageRanking.ts to export filterGroupsByQuery("
);

assert.match(
  helperSource,
  /export\s+function\s+formatGroupUsageHint\s*\(/,
  "expected utils/groupUsageRanking.ts to export formatGroupUsageHint("
);

{
  const now = Date.now();
  const groups = [
    { id: "group-alpha", name: "Alpha Crew", playerIds: ["canon-1", "canon-2"] },
    { id: "group-beta", name: "Beta Crew", playerIds: ["canon-3", "canon-4"] },
    { id: "group-amber", name: "Amber Crew", playerIds: ["canon-5", "canon-6"] },
  ];
  const games = [
    {
      createdAt: now - 30 * 60 * 1000,
      players: [{ id: "legacy-1" }, { id: "canon-2" }],
    },
    {
      groupId: "group-beta",
      createdAt: now - 3 * 60 * 60 * 1000,
      players: [{ id: "canon-3" }, { id: "canon-4" }],
    },
    {
      groupId: "group-amber",
      createdAt: now - 3 * 60 * 60 * 1000,
      players: [{ id: "canon-5" }, { id: "canon-6" }],
    },
  ];

  const ranked = rankGroupsWithUsage(groups, games, {
    normalizePlayerId: (playerId) =>
      ({
        "legacy-1": "canon-1",
      })[playerId] ?? playerId,
  });

  assert.equal(
    ranked[0].id,
    "group-alpha",
    "expected alias-aware combo matching to rank the canonical saved group first"
  );
  assert.equal(ranked[0].inferredUseCount, 1);
  assert.equal(ranked[0].inferredRecentAt, now - 30 * 60 * 1000);
  assert.deepEqual(
    Array.from(ranked.slice(1), (group) => group.id),
    ["group-amber", "group-beta"],
    "expected equal-count groups to sort by recent use, then name"
  );
}

{
  const filtered = filterGroupsByQuery(
    [
      { id: "g1", name: "Launch Team", playerIds: ["p1", "p2"] },
      { id: "g2", name: "Silent Runners", playerIds: ["p3"] },
    ],
    "lovelace",
    new Map([
      ["p1", { name: "Ada Lovelace" }],
      ["p2", { name: "Grace Hopper" }],
      ["p3", { name: "Katherine Johnson" }],
    ])
  );

  assert.deepEqual(
    Array.from(filtered, (group) => group.id),
    ["g1"],
    "expected member-name queries to match saved groups"
  );
}

{
  const hint = formatGroupUsageHint({
    id: "g1",
    name: "Launch Team",
    playerIds: ["p1", "p2", "p3"],
    inferredUseCount: 2,
    inferredRecentAt: Date.now() - 2 * 60 * 60 * 1000,
  });

  assert.match(
    hint,
    /^2 missions \/ \d+h ago$/,
    "expected usage hints to stay compact and ASCII-only"
  );
  assert.doesNotMatch(
    hint,
    /[^\x00-\x7F]/,
    "expected formatGroupUsageHint output to avoid non-ASCII separators"
  );
  assert.equal(
    formatGroupUsageHint({
      id: "g2",
      name: "Fallback Crew",
      playerIds: ["p1", "p2", "p3", "p4"],
    }),
    "4 players",
    "expected formatGroupUsageHint to fall back to player counts"
  );
}

assert.match(
  homeSource,
  /rankGroupsWithUsage\s*\(/,
  "expected app/index.tsx to use rankGroupsWithUsage("
);

assert.match(
  addPlayersSource,
  /canonicalizeSelectablePlayers/,
  "expected app/add-players.tsx to derive canonical player-id aliases for saved-group ranking"
);

assert.match(
  addPlayersSource,
  /normalizePlayerId\s*:/,
  "expected app/add-players.tsx to pass alias-aware player-id normalization into rankGroupsWithUsage"
);

assert.match(
  addPlayersSource,
  /const\s+\[\s*groupSearchQuery\s*,\s*setGroupSearchQuery\s*\]\s*=\s*useState/,
  "expected app/add-players.tsx to define groupSearchQuery state"
);

assert.match(
  addPlayersSource,
  /const\s+\[\s*groupSortMode\s*,\s*setGroupSortMode\s*\]\s*=\s*useState<[^>]*>\s*\(\s*\"most-played\"\s*\)/,
  "expected app/add-players.tsx to define groupSortMode state defaulting to \"most-played\""
);

assert.match(
  addPlayersSource,
  /placeholder=\"Search groups\"/,
  "expected app/add-players.tsx to render placeholder=\"Search groups\""
);

assert.match(
  addPlayersSource,
  /Most Played/,
  "expected app/add-players.tsx to render a Most Played sort chip"
);

assert.match(
  addPlayersSource,
  /Recent/,
  "expected app/add-players.tsx to render a Recent sort chip"
);

assert.match(
  addPlayersSource,
  /A-Z/,
  "expected app/add-players.tsx to render an A-Z sort chip"
);

assert.match(
  addPlayersSource,
  /formatGroupUsageHint\s*\(/,
  "expected app/add-players.tsx to use formatGroupUsageHint("
);

assert.match(
  addPlayersSource,
  /No saved groups match your search\./,
  "expected app/add-players.tsx to show a dedicated empty state for search misses"
);

console.log("group-discovery.test.cjs passed");
