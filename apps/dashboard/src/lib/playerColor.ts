import {
  getPlayerBaseColor,
  normalizePlayerColor,
} from "../../../../utils/colors";

/**
 * Participant rows store colors as bare words ("purple", "blue"), not hex. Handed
 * straight to CSS those resolve to the named web colors — `purple` is #800080 and
 * `blue` is #0000FF, both nearly invisible on this background — so every surface
 * that paints a player must go through the app's palette instead.
 */
export function playerAccent(color: string | null | undefined, fallback = "var(--accent)") {
  const normalized = String(color ?? "").trim();
  if (!normalized) {
    return fallback;
  }

  return getPlayerBaseColor(normalized);
}

export { normalizePlayerColor };
