import { CardColor, getCardsByColor } from "@/playerCardCatalog";

export function normalizeCardColor(color?: string): CardColor | null {
  switch ((color ?? "").toLowerCase()) {
    case "blue":
    case "#60a5fa":
      return "blue";

    case "green":
    case "#22c55e":
    case "#14b8a6":
      return "green";

    case "purple":
    case "#8b5cf6":
    case "#ec4899":
      return "purple";

    case "orange":
    case "#f59e0b":
    case "#f97316":
    case "#ef4444":
      return "orange";

    case "yellow":
      return "yellow";

    default:
      return null;
  }
}

export function getCardArtIndicesForColor(color?: string): number[] {
  const normalized = normalizeCardColor(color);
  if (!normalized) return [];

  return getCardsByColor(normalized)
    .map((card) => card?.artIndex)
    .filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <= 29
    );
}

export function pickRandomCardArtIndexForColor(color?: string): number | null {
  const colorIndices = getCardArtIndicesForColor(color);
  if (!colorIndices.length) return null;

  const chosen =
    colorIndices[Math.floor(Math.random() * colorIndices.length)] ?? null;

  return typeof chosen === "number" ? chosen : null;
}

export function pickUniqueCardArtIndexForColor(
  color: string | undefined,
  usedArtIndices: Set<number>
): number | null {
  const colorIndices = getCardArtIndicesForColor(color);
  if (!colorIndices.length) return null;

  const unused = colorIndices.filter((index) => !usedArtIndices.has(index));
  const pool = unused.length > 0 ? unused : colorIndices;

  const chosen = pool[0] ?? null;
  if (typeof chosen === "number") {
    usedArtIndices.add(chosen);
    return chosen;
  }

  return null;
}

export function isValidPlayerCardArtIndex(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 29
  );
}