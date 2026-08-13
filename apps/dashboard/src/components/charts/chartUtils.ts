export function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    : [];
}

export function toText(value: unknown, fallback = "") {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : fallback;
}

export function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]+/g, "");
    if (!/[0-9]/.test(cleaned)) {
      return null;
    }

    const normalized = Number(cleaned);
    return Number.isFinite(normalized) ? normalized : null;
  }

  return null;
}

export const PLAYER_FALLBACK_COLORS = [
  "#3B82F6",
  "#14B8A6",
  "#A855F7",
  "#F59E0B",
  "#22C55E",
  "#EF4444",
];

export function resolvePlayerFallbackColor(value: unknown, index: number) {
  const normalized = toText(value).trim();
  if (
    normalized.startsWith("#") ||
    normalized.startsWith("rgb") ||
    normalized.startsWith("hsl") ||
    normalized.startsWith("var(")
  ) {
    return normalized;
  }

  return (
    PLAYER_FALLBACK_COLORS[index % PLAYER_FALLBACK_COLORS.length] ??
    PLAYER_FALLBACK_COLORS[0]
  );
}

export function extractNumericKeys(rows: Array<Record<string, unknown>>) {
  const keySet = new Set<string>();

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (toNumber(value) !== null) {
        keySet.add(key);
      }
    }
  }

  return Array.from(keySet);
}
