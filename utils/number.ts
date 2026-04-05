// utils/number.ts
export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    if (!cleaned) return fallback;

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (value == null) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clampNumber(
  value: unknown,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  fallback = 0,
): number {
  const num = toNumber(value, fallback);
  return Math.min(max, Math.max(min, num));
}
