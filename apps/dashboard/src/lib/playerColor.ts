import {
  CHART_COLOR_ORDER,
  getPlayerBaseColor,
  normalizePlayerColor,
} from "../../../../utils/colors";

/**
 * Participant rows store colors as bare words ("purple", "blue"), not hex. Handed
 * straight to CSS those resolve to the named web colors — `purple` is #800080 and
 * `blue` is #0000FF, both nearly invisible on this background — so every surface
 * that paints a player must go through the app's palette instead.
 */
export function playerAccent(
  color: string | null | undefined,
  fallback = "var(--accent)",
) {
  const normalized = String(color ?? "").trim();
  if (!normalized) {
    return fallback;
  }

  return getPlayerBaseColor(normalized);
}

const PALETTE = CHART_COLOR_ORDER.map((name) => getPlayerBaseColor(name));

type AccentTarget = {
  color?: string | null;
  id: string;
};

/**
 * Players can save the same color as someone else at the same table — six of the
 * archived games have two players stored as "blue" — which would paint both with
 * one accent and make the pair indistinguishable. Keep each player's own color
 * where it is unique in the game and move the later clash to the next free
 * palette entry.
 *
 * Assignment walks players in id order, not display order, so History, the
 * standings, and the trend meters all agree on who owns which accent even though
 * each view sorts its rows differently.
 */
export function assignDistinctAccents(
  players: AccentTarget[],
): Record<string, string> {
  const canonical = [...players].sort((left, right) =>
    left.id.localeCompare(right.id),
  );

  const accents: Record<string, string> = {};
  const taken = new Set<string>();
  const clashes: AccentTarget[] = [];

  for (const player of canonical) {
    const stored = String(player.color ?? "").trim();
    const accent = stored ? getPlayerBaseColor(stored) : null;

    if (accent && !taken.has(accent)) {
      taken.add(accent);
      accents[player.id] = accent;
    } else {
      clashes.push(player);
    }
  }

  for (const player of clashes) {
    const free = PALETTE.find((entry) => !taken.has(entry));

    if (free) {
      taken.add(free);
      accents[player.id] = free;
    } else {
      // More players than palette entries; fall back to the stored color.
      accents[player.id] = playerAccent(player.color);
    }
  }

  return accents;
}

export { normalizePlayerColor };
