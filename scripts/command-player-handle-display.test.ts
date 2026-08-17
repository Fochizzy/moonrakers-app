import assert from "node:assert/strict";

import {
  matchesPlayerNameQuery,
  resolvePlayerDisplayName,
  resolvePlayerInitials,
} from "@/utils/playerDisplayName";

// Shape the Command page actually receives: player_name merged with the
// registered profile's display_name, plus initials built from the table name.
const LEAGUE = [
  { id: "1", name: "Izzy", displayName: "Fochizzy", initials: "I" },
  { id: "2", name: "Corey", displayName: "Lurker", initials: "C" },
  { id: "3", name: "Greg", displayName: "GregMtG", initials: "G" },
  { id: "4", name: "James", displayName: "RevLoki", initials: "J" },
];

// The handle is what gets published, never the name at the table.
for (const player of LEAGUE) {
  assert.equal(
    resolvePlayerDisplayName(player),
    player.displayName,
    `expected ${player.name} to publish as ${player.displayName}`,
  );
}

// A profile with no handle still renders something usable.
assert.equal(resolvePlayerDisplayName({ name: "Sam" }), "Sam");
assert.equal(resolvePlayerDisplayName({}), "Unknown");

// Initials follow the handle, not the stored value derived from the table name,
// and stay one letter per single-word handle so the group card still fits.
assert.equal(resolvePlayerInitials(LEAGUE[0]), "F");
assert.equal(resolvePlayerInitials(LEAGUE[3]), "R");
assert.equal(resolvePlayerInitials({ name: "Ada Lovelace" }), "AL");

// Searching matches the handle, case-insensitively and on partials.
for (const [query, expected] of [
  ["lurk", "Lurker"],
  ["FOCH", "Fochizzy"],
  ["gregmtg", "GregMtG"],
  ["revloki", "RevLoki"],
] as const) {
  assert.deepEqual(
    LEAGUE.filter((player) => matchesPlayerNameQuery(player, query)).map(
      (player) => player.displayName,
    ),
    [expected],
    `expected "${query}" to match only ${expected}`,
  );
}

// The table name is not a search field. Only handles and their initials are
// matched, so a name that shares no substring with its handle finds nothing.
for (const realName of ["Corey", "James"]) {
  assert.deepEqual(
    LEAGUE.filter((player) => matchesPlayerNameQuery(player, realName)),
    [],
    `expected the table name "${realName}" not to match any card`,
  );
}

// "Izzy" and "Greg" still match, but only because their handles happen to
// contain them as substrings — "Fochizzy" ends in "izzy", "GregMtG" starts with
// "greg". That is the handle matching itself, not the table name leaking back
// in, and it stays true however profiles.player_name is stored.
assert.deepEqual(
  LEAGUE.filter((player) => matchesPlayerNameQuery(player, "Izzy")).map(
    (player) => player.displayName,
  ),
  ["Fochizzy"],
);
assert.deepEqual(
  LEAGUE.filter((player) => matchesPlayerNameQuery({ displayName: player.displayName }, "Greg")).map(
    (player) => player.displayName,
  ),
  ["GregMtG"],
  "expected the match to survive with the table name absent entirely",
);

// An empty query keeps the full roster rather than clearing it.
assert.equal(LEAGUE.filter((player) => matchesPlayerNameQuery(player, "  ")).length, 4);

console.log("command-player-handle-display.test.ts passed");
