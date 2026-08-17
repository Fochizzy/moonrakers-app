import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDuplicateDisplayNameMessage,
  findDisplayNameConflict,
  normalizeDisplayNameForUniqueness,
} from "../lib/auth/displayNameUniqueness.ts";
import { formatSupabaseConfigError } from "../lib/supabase.ts";

const profiles = [
  {
    id: "u1",
    name: "Alpha",
    displayName: "Commander",
    hasSavedGames: false,
  },
  {
    id: "u2",
    name: "Beta",
    displayName: "Navigator",
    hasSavedGames: true,
  },
];

assert.equal(normalizeDisplayNameForUniqueness("  Commander  "), "commander");
assert.equal(normalizeDisplayNameForUniqueness("   "), null);

assert.equal(
  findDisplayNameConflict({
    displayName: " commander ",
    currentUserId: "u3",
    profiles,
  })?.id,
  "u1",
);

assert.equal(
  findDisplayNameConflict({
    displayName: " commander ",
    currentUserId: "u1",
    profiles,
  }),
  null,
);

assert.match(
  buildDuplicateDisplayNameMessage("Commander"),
  /unique display name/i,
);

assert.match(
  formatSupabaseConfigError({
    message: "duplicate key value violates unique constraint",
    details: "Key (display_name)=(Commander) already exists.",
  }),
  /unique display name/i,
);

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registerSource = fs.readFileSync(
  path.join(projectRoot, "app", "register.tsx"),
  "utf8",
);
const migrationSource = fs.readFileSync(
  path.join(
    projectRoot,
    "supabase",
    "migrations",
    "20260523033000_moonrakers_unique_display_names.sql",
  ),
  "utf8",
);
const usernameMigrationSource = fs.readFileSync(
  path.join(
    projectRoot,
    "supabase",
    "migrations",
    "20260817210532_moonrakers_guest_player_authorization.sql",
  ),
  "utf8",
);

assert.doesNotMatch(
  registerSource,
  /buildDuplicateDisplayNameMessage|findDisplayNameConflict/,
  "expected username-only registration to stop validating a second display name",
);
assert.doesNotMatch(
  registerSource,
  /Display name \(optional\)/,
  "expected username-only registration to remove the display-name field",
);

assert.match(
  migrationSource,
  /create or replace function public\.enforce_unique_profile_display_name\(\)/i,
  "expected the migration to add a database guard for unique profile display names",
);

assert.match(
  usernameMigrationSource,
  /create unique index if not exists profiles_active_player_name_lower_key[\s\S]*lower\(btrim\(player_name\)\)/i,
  "expected active usernames to be unique case-insensitively",
);
assert.match(
  usernameMigrationSource,
  /profiles_username_only_check[\s\S]*display_name is null or btrim\(display_name\) = btrim\(player_name\)/i,
  "expected the compatibility display_name column to stop carrying a second identity",
);

assert.match(
  migrationSource,
  /create trigger profiles_enforce_unique_display_name[\s\S]*before insert or update on public\.profiles/i,
  "expected the migration to attach the unique display-name guard to profile writes",
);

console.log("display-name-uniqueness.test.ts passed");
