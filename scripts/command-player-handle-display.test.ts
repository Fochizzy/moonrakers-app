import assert from "node:assert/strict";

import {
  matchesPlayerNameQuery,
  resolvePlayerDisplayName,
  resolvePlayerInitials,
} from "@/utils/playerDisplayName";

// Until the migration is applied, production still has old names in
// player_name and canonical usernames in display_name. The compatibility
// resolver must publish the username during that window.
const LEAGUE = [
  { id: "1", name: "Izzy", displayName: "Fochizzy", initials: "I" },
  { id: "2", name: "Corey", displayName: "Lurker", initials: "C" },
  { id: "3", name: "Greg", displayName: "GregMtG", initials: "G" },
  { id: "4", name: "James", displayName: "RevLoki", initials: "J" },
];

// The username is what gets published.
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

// Initials follow the username, not a cached legacy initial.
assert.equal(resolvePlayerInitials(LEAGUE[0]), "F");
assert.equal(resolvePlayerInitials(LEAGUE[3]), "R");
assert.equal(resolvePlayerInitials({ name: "Ada Lovelace" }), "AL");

// Searching matches the username, case-insensitively and on partials.
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

// Legacy display names are not a search field.
for (const realName of ["Corey", "James"]) {
  assert.deepEqual(
    LEAGUE.filter((player) => matchesPlayerNameQuery(player, realName)),
    [],
    `expected the table name "${realName}" not to match any card`,
  );
}

// Partial username matching still works.
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
  "expected username matching without the old player_name field",
);

// An empty query keeps the full roster rather than clearing it.
assert.equal(LEAGUE.filter((player) => matchesPlayerNameQuery(player, "  ")).length, 4);

console.log("command-player-handle-display.test.ts passed");
