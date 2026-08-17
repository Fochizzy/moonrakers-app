const assert = require("node:assert/strict");
const path = require("node:path");

require("./support/ts-require.cjs");

const {
  normalizeRegisteredProfiles,
} = require(path.join(
  __dirname,
  "..",
  "lib",
  "cloud",
  "normalizeRegisteredProfiles.ts",
));
const {
  mergeRegisteredProfileIntoPlayer,
} = require(path.join(
  __dirname,
  "..",
  "utils",
  "registeredProfilePlayer.ts",
));

const [guest, player] = normalizeRegisteredProfiles([
  {
    id: "11111111-1111-4111-8111-111111111111",
    player_name: "GuestOne",
    is_guest: true,
    has_passcode: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    player_name: "PlayerOne",
    is_guest: false,
    has_passcode: false,
  },
]);

assert.equal(guest.name, "GuestOne");
assert.equal(guest.isGuest, true);
assert.equal(guest.hasPasscode, true);
assert.equal(player.isGuest, false);
assert.equal(player.hasPasscode, false);

const merged = mergeRegisteredProfileIntoPlayer(
  { id: guest.id, name: guest.name, isGuest: false, hasPasscode: false },
  guest,
);
assert.equal(merged.isGuest, true, "expected cloud guest classification to win");
assert.equal(merged.hasPasscode, true, "expected passcode availability to survive hydration");

const productionUsernames = normalizeRegisteredProfiles([
  { id: "a", player_name: "James", display_name: "RevLoki" },
  { id: "b", player_name: "Izzy", display_name: "Fochizzy" },
  { id: "c", player_name: "Greg", display_name: "GregMtG" },
  { id: "d", player_name: "Corey", display_name: "Lurker" },
  { id: "e", player_name: "Cpl_Baloo", display_name: "Cpl_Baloo" },
]).map((profile) => profile.name);

assert.deepEqual(
  productionUsernames,
  ["RevLoki", "Fochizzy", "GregMtG", "Lurker", "Cpl_Baloo"],
  "expected the Command directory to publish canonical usernames before the migration is applied",
);

console.log("registered-profile-access-flags.test.cjs passed");
