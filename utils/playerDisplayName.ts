/**
 * Profiles carry two names: `name` (the name at the table, from
 * `profiles.player_name`) and `displayName` (the handle, from
 * `profiles.display_name`). Player-facing surfaces publish the handle, so the
 * same person is not "Izzy" on the Command page and "Fochizzy" one screen over.
 *
 * Resolution lives here rather than inline at each call site, matching the
 * dashboard's `apps/dashboard/src/lib/playerName.ts`.
 */

export type PlayerNameSource = {
  name?: string | null;
  displayName?: string | null;
  initials?: string | null;
};

function trimmed(value: unknown) {
  return String(value ?? "").trim();
}

export function resolvePlayerDisplayName(
  source: PlayerNameSource | null | undefined,
  fallback = "Unknown",
) {
  return trimmed(source?.displayName) || trimmed(source?.name) || fallback;
}

/**
 * Derived from the published name, not the stored `initials`. That field was
 * built from the table name when the profile was created, so it still reads "I"
 * for Fochizzy and would leak the first letter of a name we no longer show.
 */
export function resolvePlayerInitials(
  source: PlayerNameSource | null | undefined,
  fallback = "?",
) {
  const parts = resolvePlayerDisplayName(source, "").split(/\s+/).filter(Boolean);
  const [first, second] = parts;

  // One letter for a single-word handle, matching the previous getInitials
  // behaviour — the group card packs five of these into a half-width row.
  if (first === undefined) return fallback;
  if (second === undefined) return first.slice(0, 1).toUpperCase();
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
}

/**
 * Matches only what the card actually shows. Searching the table name is
 * deliberately not supported: typing "Izzy" should not surface Fochizzy, because
 * the table name is not a thing this app publishes any more.
 */
export function matchesPlayerNameQuery(
  source: PlayerNameSource | null | undefined,
  query: string,
) {
  const needle = trimmed(query).toLowerCase();
  if (!needle) return true;

  return [
    resolvePlayerDisplayName(source, ""),
    resolvePlayerInitials(source, ""),
  ].some((value) => value.toLowerCase().includes(needle));
}
