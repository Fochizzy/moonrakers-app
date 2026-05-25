import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveLaunchRoute } from "../lib/auth/launchRoute.ts";
import { buildSavedAuthProfile } from "../lib/auth/registerFlow.ts";

const completedProfile = buildSavedAuthProfile(
  "u1",
  "  James  ",
  " RevLoki ",
  "purple",
  2,
);

assert.deepEqual(completedProfile, {
  id: "u1",
  player_name: "James",
  display_name: "RevLoki",
  favorite_color: "purple",
  assigned_card_art_index: 2,
});

assert.equal(
  resolveLaunchRoute({
    session: { user: { id: "u1", email: "jmhodnett@gmail.com" } },
    profile: completedProfile,
    passwordRecoveryPending: false,
  }),
  "/",
);

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storeSource = fs.readFileSync(
  path.join(projectRoot, "store", "useStore.ts"),
  "utf8",
);
const registerSource = fs.readFileSync(
  path.join(projectRoot, "app", "register.tsx"),
  "utf8",
);
const rosterSource = fs.readFileSync(
  path.join(projectRoot, "app", "add-players.tsx"),
  "utf8",
);

assert.match(storeSource, /upsertRegisteredProfile:/);
assert.match(registerSource, /upsertRegisteredProfile/);
assert.match(registerSource, /Preferred color|favoriteColor/);
assert.match(rosterSource, /assigned_card_art_index|assignedCardArtIndex|favorite_color|favoriteColor/);

console.log("register-profile-completion.test.ts passed");
