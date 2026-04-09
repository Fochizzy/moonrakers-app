export type CardColor = "blue" | "green" | "purple" | "orange" | "yellow";

export const SHEET_COLUMNS = 5;
export const SHEET_ROWS = 6;

export function normalizeCardColor(color?: string): CardColor | null {
  switch ((color ?? "").toLowerCase()) {
    case "blue":
    case "green":
    case "purple":
    case "orange":
    case "yellow":
      return (color ?? "").toLowerCase() as CardColor;
    default:
      return null;
  }
}

export function getColorColumn(color?: string): number {
  switch ((color ?? "").toLowerCase()) {
    case "blue":
      return 0;
    case "green":
      return 1;
    case "purple":
      return 2;
    case "orange":
      return 3;
    case "yellow":
      return 4;
    default:
      return 0;
  }
}

export function buildArtIndexFromRowAndColor(row: number, color?: string): number {
  return row * SHEET_COLUMNS + getColorColumn(color);
}

export function getRowFromArtIndex(artIndex?: number | null): number | null {
  if (typeof artIndex !== "number" || !Number.isFinite(artIndex)) return null;
  return Math.floor(artIndex / SHEET_COLUMNS);
}

export function getAllArtIndicesForColor(color?: string): number[] {
  const normalized = normalizeCardColor(color);
  if (!normalized) return [];
  return Array.from({ length: SHEET_ROWS }, (_, row) =>
    buildArtIndexFromRowAndColor(row, normalized)
  );
}

export function getUsedArtIndicesForColor(
  players: Array<{ id?: string; color?: string; assignedCardArtIndex?: number | null }>,
  color?: string,
  excludePlayerId?: string
): number[] {
  const normalized = normalizeCardColor(color);
  if (!normalized) return [];

  return players
    .filter((player) => {
      if (!player) return false;
      if (excludePlayerId && String(player.id) === String(excludePlayerId)) return false;
      return normalizeCardColor(player.color) === normalized;
    })
    .map((player) => player.assignedCardArtIndex)
    .filter((artIndex): artIndex is number => typeof artIndex === "number" && Number.isFinite(artIndex));
}

export function pickAvailableArtIndexForColor(
  color?: string,
  players: Array<{ id?: string; color?: string; assignedCardArtIndex?: number | null }> = [],
  excludePlayerId?: string
): number | null {
  const all = getAllArtIndicesForColor(color);
  if (!all.length) return null;

  const used = new Set(getUsedArtIndicesForColor(players, color, excludePlayerId));
  const available = all.filter((artIndex) => !used.has(artIndex));

  const pool = available.length > 0 ? available : all;
  const choice = pool[Math.floor(Math.random() * pool.length)];
  return typeof choice === "number" ? choice : null;
}

export function ensurePlayersHaveAssignedCards(
  players: Array<{ id?: string; color?: string; assignedCardArtIndex?: number | null }>,
  assignPlayerCard: (playerId: string, artIndex: number) => void
) {
  if (!Array.isArray(players) || typeof assignPlayerCard !== "function") return;

  players.forEach((player) => {
    const playerId = String(player?.id ?? "");
    if (!playerId) return;
    if (player?.assignedCardArtIndex != null) return;

    const artIndex = pickAvailableArtIndexForColor(player?.color, players, playerId);
    if (artIndex == null) return;

    assignPlayerCard(playerId, artIndex);
  });
}

export function getPlayerInitials(name?: string): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}
