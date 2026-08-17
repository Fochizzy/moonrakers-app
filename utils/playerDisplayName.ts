/**
 * `name` is the profile username after the migration. Before that migration,
 * the same username is still present in the legacy `displayName` field, so it
 * temporarily wins as a compatibility source.
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
 * Derived from the username rather than trusting cached initials.
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
 * Matches only the username the card actually shows.
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
