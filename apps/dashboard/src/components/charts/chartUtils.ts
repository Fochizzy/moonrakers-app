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
    const normalized = Number(value.replace(/[^0-9.-]+/g, ""));
    return Number.isFinite(normalized) ? normalized : null;
  }

  return null;
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
