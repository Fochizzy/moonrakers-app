type PreviewPlayerLike = {
  id?: string | null;
};

function normalizeId(value: unknown) {
  return String(value ?? "").trim();
}

export function buildPlayerSelectionPreview<T extends PreviewPlayerLike>(
  players: T[],
  args: {
    maxVisible: number;
    priorityPlayerIds?: Array<string | null | undefined>;
  },
): T[] {
  const orderedPlayers = Array.isArray(players) ? players : [];
  const maxVisible = Math.max(0, Math.floor(args.maxVisible));

  if (maxVisible === 0 || orderedPlayers.length === 0) {
    return [];
  }

  const priorityPlayerIds = (args.priorityPlayerIds ?? []).filter(
    (playerId, index, allIds) => {
      const normalizedPlayerId = normalizeId(playerId);
      return (
        Boolean(normalizedPlayerId) &&
        allIds.findIndex((candidate) => normalizeId(candidate) === normalizedPlayerId) === index
      );
    },
  );

  const playersById = new Map<string, T>();
  for (const player of orderedPlayers) {
    const playerId = normalizeId(player?.id);
    if (!playerId || playersById.has(playerId)) {
      continue;
    }

    playersById.set(playerId, player);
  }

  const previewPlayers: T[] = [];
  const seenPlayerIds = new Set<string>();

  for (const rawPriorityPlayerId of priorityPlayerIds) {
    const priorityPlayerId = normalizeId(rawPriorityPlayerId);
    const player = playersById.get(priorityPlayerId);
    if (!priorityPlayerId || !player || seenPlayerIds.has(priorityPlayerId)) {
      continue;
    }

    seenPlayerIds.add(priorityPlayerId);
    previewPlayers.push(player);

    if (previewPlayers.length >= maxVisible) {
      return previewPlayers;
    }
  }

  for (const player of orderedPlayers) {
    const playerId = normalizeId(player?.id);
    if (!playerId || seenPlayerIds.has(playerId)) {
      continue;
    }

    seenPlayerIds.add(playerId);
    previewPlayers.push(player);

    if (previewPlayers.length >= maxVisible) {
      break;
    }
  }

  return previewPlayers;
}
