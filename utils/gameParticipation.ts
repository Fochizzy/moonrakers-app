type ParticipantLike = {
  id?: string | null;
  playerId?: string | null;
};

type ParticipantGame = {
  players?: ParticipantLike[] | null;
  totals?: Record<string, unknown> | null;
};

function normalizeId(value: unknown): string {
  return String(value ?? "").trim();
}

export function getGameParticipantIds(
  game: ParticipantGame | null | undefined
): string[] {
  const ids = new Set<string>();

  for (const player of Array.isArray(game?.players) ? game.players : []) {
    const normalizedId = normalizeId(player?.id ?? player?.playerId);
    if (normalizedId) {
      ids.add(normalizedId);
    }
  }

  for (const rawId of Object.keys(game?.totals ?? {})) {
    const normalizedId = normalizeId(rawId);
    if (normalizedId) {
      ids.add(normalizedId);
    }
  }

  return [...ids];
}

export function gameIncludesAllPlayers(
  game: ParticipantGame | null | undefined,
  playerIds: readonly (string | null | undefined)[]
): boolean {
  const requiredIds = [...new Set(playerIds.map(normalizeId).filter(Boolean))];
  if (!requiredIds.length) {
    return true;
  }

  const participantIds = new Set(getGameParticipantIds(game));
  return requiredIds.every((playerId) => participantIds.has(playerId));
}

export function filterGamesForFocusedPlayer<T extends ParticipantGame>(
  games: readonly T[] | null | undefined,
  focusedPlayerId?: string | null,
  additionalPlayerIds: readonly (string | null | undefined)[] = []
): T[] {
  const safeGames = Array.isArray(games) ? [...games] : [];
  const focusedId = normalizeId(focusedPlayerId);
  const requiredIds = focusedId
    ? [focusedId, ...additionalPlayerIds]
    : [...additionalPlayerIds];

  if (!requiredIds.some(Boolean)) {
    return safeGames;
  }

  return safeGames.filter((game) => gameIncludesAllPlayers(game, requiredIds));
}
