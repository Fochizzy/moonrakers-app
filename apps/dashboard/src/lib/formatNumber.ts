/**
 * One place to turn payload numbers into display text.
 *
 * Server payloads carry numbers as `number` in some fields and `string` in
 * others, and a missing field must never look like a real zero, so every
 * helper here takes `unknown` and returns `MISSING` when there is nothing to
 * show.
 */

/** Rendered wherever a value is absent, so a real 0 stays distinguishable. */
export const MISSING = "—";

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

/** Whole numbers with thousands separators: games, rounds, prestige. */
export function formatCount(value: unknown, fallback = MISSING) {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return fallback;
  }

  return Math.round(numeric).toLocaleString("en-US");
}

/** Ratings are stored as floats but always read as whole numbers. */
export function formatRating(value: unknown, fallback = MISSING) {
  return formatCount(value, fallback);
}

export function formatDecimal(value: unknown, digits = 2, fallback = MISSING) {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return fallback;
  }

  return numeric.toFixed(digits);
}

/** Takes a 0–1 ratio, not an already-multiplied percentage. */
export function formatPercent(value: unknown, digits = 0, fallback = MISSING) {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return fallback;
  }

  return `${(numeric * 100).toFixed(digits)}%`;
}

export function formatSigned(value: unknown, digits = 0, fallback = MISSING) {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return fallback;
  }

  const rendered = digits > 0 ? numeric.toFixed(digits) : String(Math.round(numeric));
  return numeric > 0 ? `+${rendered}` : rendered;
}

/** Win–loss record, written the same way on every surface. */
export function formatRecord(wins: unknown, losses: unknown, fallback = MISSING) {
  const winCount = toFiniteNumber(wins);
  const lossCount = toFiniteNumber(losses);

  if (winCount === null && lossCount === null) {
    return fallback;
  }

  return `${Math.round(winCount ?? 0)}W–${Math.round(lossCount ?? 0)}L`;
}

/**
 * Payload scalars whose type we cannot know ahead of time. Numbers go through
 * the numeric formatter so a float never reaches the screen at full precision;
 * anything else is passed through as written.
 */
export function formatScalar(value: unknown, fallback = MISSING) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? formatCount(value, fallback) : formatDecimal(value, 2, fallback);
  }

  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  return fallback;
}

/** Turns `assistPrestigeReceived` / `assist_prestige_received` into a label. */
export function humanizeKey(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}
