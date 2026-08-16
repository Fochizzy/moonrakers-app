type LineSeriesIdentityInput = {
  id: string;
  name?: string | null;
  color?: string | null;
  colorValue?: string | null;
};

export type LineSeriesIdentity = {
  id: string;
  normalizedColor: string;
  hasColorCollision: boolean;
  collisionIndex: number;
  strokeDasharray: string | null;
  collisionBadgeText: string | null;
};

const COLLISION_DASH_PATTERNS: readonly (string | null)[] = [
  null,
  "10 7",
  "3 6",
  "14 6 3 6",
  "18 7",
  "6 5 2 5",
] as const;

function normalizeColorKey(color: unknown): string {
  return String(color ?? "").trim().toLowerCase();
}

function getRowColorKey(row: LineSeriesIdentityInput): string {
  return normalizeColorKey(row.color ?? row.colorValue);
}

function getCollisionDashPattern(index: number): string | null {
  if (index <= 0) {
    return null;
  }

  const pattern =
    COLLISION_DASH_PATTERNS[index] ??
    COLLISION_DASH_PATTERNS[((index - 1) % (COLLISION_DASH_PATTERNS.length - 1)) + 1];

  return pattern ?? null;
}

function normalizeBadgeSource(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function buildBadgeCandidates(
  row: LineSeriesIdentityInput,
  rowIndex: number,
): string[] {
  const source = normalizeBadgeSource(row.name || row.id);
  const words = source.split(/\s+/).filter(Boolean);
  const compact = words.join("");
  const initials = words.map((word) => word[0]).join("");
  const candidates: string[] = [];

  if (initials.length >= 2) {
    candidates.push(initials.slice(0, 2));
  }

  for (let length = 2; length <= Math.min(4, compact.length); length += 1) {
    candidates.push(compact.slice(0, length));
  }

  if (initials.length === 1) {
    candidates.push(initials);
  }

  if (compact) {
    candidates.push(compact.slice(0, Math.min(5, compact.length)));
  }

  candidates.push(`P${rowIndex + 1}`);

  return [...new Set(candidates.filter(Boolean))];
}

function buildCollisionBadgeMap<T extends LineSeriesIdentityInput>(
  rows: T[],
): Map<string, string> {
  const used = new Set<string>();
  const labels = new Map<string, string>();

  rows.forEach((row, rowIndex) => {
    const candidates = buildBadgeCandidates(row, rowIndex);
    let chosen = candidates.find((candidate) => !used.has(candidate)) ?? null;

    if (!chosen) {
      const base = (candidates[0] || `P${rowIndex + 1}`).slice(0, 3);
      let suffix = 2;
      chosen = `${base}${suffix}`;
      while (used.has(chosen)) {
        suffix += 1;
        chosen = `${base}${suffix}`;
      }
    }

    used.add(chosen);
    labels.set(row.id, chosen);
  });

  return labels;
}

export function buildLineSeriesIdentities<T extends LineSeriesIdentityInput>(
  rows: T[],
): Array<T & LineSeriesIdentity> {
  const colorCounts = new Map<string, number>();
  const colorGroups = new Map<string, T[]>();

  for (const row of rows) {
    const colorKey = getRowColorKey(row);
    colorCounts.set(colorKey, (colorCounts.get(colorKey) ?? 0) + 1);
    const group = colorGroups.get(colorKey) ?? [];
    group.push(row);
    colorGroups.set(colorKey, group);
  }

  const colorOffsets = new Map<string, number>();
  const colorBadges = new Map<string, Map<string, string>>();

  colorGroups.forEach((groupRows, colorKey) => {
    if (groupRows.length > 1) {
      colorBadges.set(colorKey, buildCollisionBadgeMap(groupRows));
    }
  });

  return rows.map((row) => {
    const normalizedColor = getRowColorKey(row);
    const hasColorCollision = (colorCounts.get(normalizedColor) ?? 0) > 1;
    const collisionIndex = hasColorCollision
      ? (colorOffsets.get(normalizedColor) ?? 0)
      : 0;

    colorOffsets.set(normalizedColor, collisionIndex + 1);

    return {
      ...row,
      normalizedColor,
      hasColorCollision,
      collisionIndex,
      strokeDasharray: hasColorCollision
        ? getCollisionDashPattern(collisionIndex)
        : null,
      collisionBadgeText: hasColorCollision
        ? colorBadges.get(normalizedColor)?.get(row.id) ?? null
        : null,
    };
  });
}
