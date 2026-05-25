import { resolveStoredPlayerColor } from "./playerColor";
import { buildArtIndexFromRowAndColor, getRowFromArtIndex, type CardColor } from "./cardAssignment";

export type GameSetupTurnOrderPlayer = {
  id: string;
  name?: string;
  color?: string;
  initials?: string;
  assignedCardArtIndex?: number | null;
  artIndex?: number | null;
};

export function initialsFromName(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function resolveTurnOrderPlayerName(
  player: Pick<GameSetupTurnOrderPlayer, "name">,
  index: number
) {
  const name = String(player.name ?? "").trim();
  return name.length ? name : `Player ${index + 1}`;
}

export function canSubmitGameSetup(
  players: Pick<GameSetupTurnOrderPlayer, "id">[] | null | undefined
) {
  const count = Array.isArray(players)
    ? players.filter((player) => String(player?.id ?? "").trim().length > 0).length
    : 0;

  return count >= 2 && count <= 5;
}

export function buildTurnOrderSummary(players: GameSetupTurnOrderPlayer[]) {
  if (!Array.isArray(players) || players.length === 0) {
    return "No players selected yet.";
  }

  return players
    .map((player, index) => `${index + 1}. ${resolveTurnOrderPlayerName(player, index)}`)
    .join(", ");
}

export function promoteTurnOrderPlayer(
  players: GameSetupTurnOrderPlayer[] | null | undefined,
  playerId: string
) {
  if (!Array.isArray(players)) return [];

  const normalizedTarget = String(playerId ?? "").trim();
  if (!normalizedTarget) return [...players];

  const targetIndex = players.findIndex(
    (player) => String(player?.id ?? "").trim() === normalizedTarget
  );

  if (targetIndex <= 0) {
    return [...players];
  }

  return [
    players[targetIndex],
    ...players.slice(0, targetIndex),
    ...players.slice(targetIndex + 1),
  ];
}

export function buildActiveGamePlayersFromTurnOrder(
  players: GameSetupTurnOrderPlayer[]
) {
  if (!Array.isArray(players)) return [];

  return players
    .filter((player) => String(player?.id ?? "").trim().length > 0)
    .map((player, index) => ({
      id: player.id,
      name: resolveTurnOrderPlayerName(player, index),
      initials:
        String(player.initials ?? "").trim().length > 0
          ? player.initials
          : initialsFromName(player.name),
      color: resolveStoredPlayerColor(player.color, index),
      assignedCardArtIndex:
        typeof player.assignedCardArtIndex === "number" &&
        Number.isFinite(player.assignedCardArtIndex)
          ? player.assignedCardArtIndex
          : null,
      startOrder: index,
    }));
}

export function applyTurnOrderPlayerColorOverride(
  players: GameSetupTurnOrderPlayer[] | null | undefined,
  playerId: string,
  nextColor: CardColor,
) {
  if (!Array.isArray(players)) return [];

  const normalizedTarget = String(playerId ?? "").trim();
  if (!normalizedTarget) return [...players];

  return players.map((player) => {
    if (String(player?.id ?? "").trim() !== normalizedTarget) {
      return player;
    }

    const currentArtIndex =
      typeof player.assignedCardArtIndex === "number" && Number.isFinite(player.assignedCardArtIndex)
        ? player.assignedCardArtIndex
        : typeof player.artIndex === "number" && Number.isFinite(player.artIndex)
          ? player.artIndex
          : null;

    const artRow = getRowFromArtIndex(currentArtIndex) ?? 0;
    const nextArtIndex = buildArtIndexFromRowAndColor(artRow, nextColor);

    return {
      ...player,
      color: nextColor,
      assignedCardArtIndex: nextArtIndex,
      artIndex: nextArtIndex,
    };
  });
}
