/**
 * Every profile carries both a `player_name` (the name at the table) and a
 * `display_name` (the handle). Pages that picked different ones showed the same
 * person under two names on one screen, so resolution happens here and nowhere
 * else: the handle wins, because that is what the leaderboard, insights, and
 * the app's own roster publish.
 */

type ProfileNameSource = {
  display_name?: string | null;
  displayName?: string | null;
  player_name?: string | null;
  playerName?: string | null;
  name?: string | null;
};

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = String(value ?? "").trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return "";
}

export function resolvePlayerName(
  source: ProfileNameSource | null | undefined,
  fallback = "Player",
) {
  return (
    firstNonEmpty(
      source?.display_name,
      source?.displayName,
      source?.player_name,
      source?.playerName,
      source?.name,
    ) || fallback
  );
}
