type DirectoryPlayer = {
  id?: string;
  name?: string;
  displayName?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
};

type RegisteredDirectoryPlayer = {
  id: string;
  name: string;
  displayName?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
};

type DirectoryGroup = {
  id?: string;
  name?: string;
  playerIds?: string[];
};

type ActiveGamePlayer = {
  id: string;
  name?: string;
  displayName?: string;
  initials?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
  startOrder?: number;
};

type ActiveGameRound = {
  id: string;
  playerId: string;
  prestige: number;
  contracts: number;
  failures: number;
  assistRecipients: Record<string, number>;
  assistPrestigeRecipients: Record<string, number>;
  objectiveCount?: number;
  objectivePrestige?: number;
  createdAt: number;
  metaType?: "main" | "bonusObjective";
  linkedTurnId?: string;
};

type ActiveGameLike = {
  id: string;
  groupId?: string;
  groupName?: string;
  players?: ActiveGamePlayer[];
  totals?: Record<string, Record<string, unknown>>;
  rounds?: ActiveGameRound[];
  [key: string]: unknown;
};

type ResolveCloudGameSaveInput = {
  activeGame: ActiveGameLike;
  winnerId?: string | null;
  playerDirectory: DirectoryPlayer[];
  groupDirectory?: DirectoryGroup[];
};

type CreateGroupRequest = {
  name: string;
  playerIds: string[];
};

type ResolveCloudGameSaveResult = {
  activeGame: ActiveGameLike & {
    players: ActiveGamePlayer[];
    totals: Record<string, Record<string, unknown>>;
    rounds: ActiveGameRound[];
    groupId?: string;
  };
  winnerId?: string | null;
  unresolvedPlayerNames: string[];
  createGroupRequest: CreateGroupRequest | null;
};

function normalizeId(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeName(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeNameKey(value: unknown) {
  return normalizeName(value).toLowerCase();
}

function isLikelyRegisteredProfileId(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalizeId(value),
  );
}

function sameIdSet(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((id, index) => id === rightSorted[index]);
}

function remapNumericRecord(
  input: Record<string, number> | null | undefined,
  idMap: Record<string, string>,
) {
  const remapped: Record<string, number> = {};

  for (const [rawId, value] of Object.entries(input ?? {})) {
    const normalizedId = normalizeId(idMap[rawId] ?? rawId);
    if (!normalizedId) {
      continue;
    }
    remapped[normalizedId] = Number(value ?? 0) || 0;
  }

  return remapped;
}

function remapTotals(
  totals: Record<string, Record<string, unknown>> | undefined,
  idMap: Record<string, string>,
) {
  const remapped: Record<string, Record<string, unknown>> = {};

  for (const [rawId, value] of Object.entries(totals ?? {})) {
    const normalizedId = normalizeId(idMap[rawId] ?? rawId);
    if (!normalizedId) {
      continue;
    }
    remapped[normalizedId] = {
      ...(remapped[normalizedId] ?? {}),
      ...(value ?? {}),
    };
  }

  return remapped;
}

function remapRounds(rounds: ActiveGameRound[] | undefined, idMap: Record<string, string>) {
  return (Array.isArray(rounds) ? rounds : []).map((round) => ({
    ...round,
    playerId: normalizeId(idMap[round.playerId] ?? round.playerId),
    assistRecipients: remapNumericRecord(round.assistRecipients, idMap),
    assistPrestigeRecipients: remapNumericRecord(
      round.assistPrestigeRecipients,
      idMap,
    ),
  }));
}

function resolveExistingGroupId(
  activeGame: ActiveGameLike,
  resolvedPlayerIds: string[],
  groupDirectory: DirectoryGroup[],
) {
  const currentGroupId = normalizeId(activeGame.groupId);
  if (isLikelyRegisteredProfileId(currentGroupId)) {
    return currentGroupId;
  }

  const normalizedGroupName = normalizeName(activeGame.groupName);
  const cloudGroups = (Array.isArray(groupDirectory) ? groupDirectory : []).filter((group) =>
    isLikelyRegisteredProfileId(group?.id),
  );

  const exactNameAndRosterMatch =
    cloudGroups.find((group) => {
      const groupName = normalizeName(group?.name);
      const groupPlayerIds = (Array.isArray(group?.playerIds) ? group.playerIds : []).map(
        normalizeId,
      );
      return (
        normalizedGroupName.length > 0 &&
        groupName === normalizedGroupName &&
        sameIdSet(groupPlayerIds, resolvedPlayerIds)
      );
    }) ?? null;

  if (exactNameAndRosterMatch?.id) {
    return normalizeId(exactNameAndRosterMatch.id);
  }

  const exactRosterMatches = cloudGroups.filter((group) =>
    sameIdSet(
      (Array.isArray(group?.playerIds) ? group.playerIds : []).map(normalizeId),
      resolvedPlayerIds,
    ),
  );

  if (exactRosterMatches.length === 1) {
    return normalizeId(exactRosterMatches[0]?.id);
  }

  return "";
}

export function resolveCloudGameSaveState(
  input: ResolveCloudGameSaveInput,
): ResolveCloudGameSaveResult {
  const registeredPlayers: RegisteredDirectoryPlayer[] = (
    Array.isArray(input.playerDirectory) ? input.playerDirectory : []
  )
    .map((player) => ({
      ...player,
      id: normalizeId(player?.id),
      name: normalizeName(player?.name),
    }))
    .filter((player) => isLikelyRegisteredProfileId(player.id) && player.name.length > 0);

  const playersById = new Map(registeredPlayers.map((player) => [player.id, player]));
  const playersByNameKey = new Map<string, RegisteredDirectoryPlayer[]>();

  for (const player of registeredPlayers) {
    const nameKey = normalizeNameKey(player.name);
    if (!nameKey) {
      continue;
    }
    if (!playersByNameKey.has(nameKey)) {
      playersByNameKey.set(nameKey, []);
    }
    playersByNameKey.get(nameKey)?.push(player);
  }

  const idMap: Record<string, string> = {};
  const unresolvedPlayerNames: string[] = [];
  const resolvedPlayers: ActiveGamePlayer[] = [];
  const seenResolvedPlayerIds = new Set<string>();

  for (const activePlayer of Array.isArray(input.activeGame.players)
    ? input.activeGame.players
    : []) {
    const currentId = normalizeId(activePlayer?.id);
    const currentName = normalizeName(activePlayer?.name);

    let resolvedProfile =
      (isLikelyRegisteredProfileId(currentId) ? playersById.get(currentId) : null) ?? null;

    if (!resolvedProfile && currentName) {
      const nameMatches = playersByNameKey.get(normalizeNameKey(currentName)) ?? [];
      if (nameMatches.length === 1) {
        resolvedProfile = nameMatches[0] ?? null;
      }
    }

    const resolvedId = normalizeId(resolvedProfile?.id ?? currentId);
    const resolvedName = normalizeName(resolvedProfile?.name ?? currentName);

    if (!isLikelyRegisteredProfileId(resolvedId) || !resolvedName) {
      unresolvedPlayerNames.push(currentName || "Unknown Player");
      continue;
    }

    if (seenResolvedPlayerIds.has(resolvedId)) {
      unresolvedPlayerNames.push(resolvedName);
      continue;
    }

    seenResolvedPlayerIds.add(resolvedId);
    idMap[currentId] = resolvedId;
    resolvedPlayers.push({
      ...activePlayer,
      id: resolvedId,
      name: resolvedName,
      displayName: normalizeName(activePlayer.displayName ?? resolvedProfile?.displayName) || undefined,
      color:
        activePlayer.color ??
        (normalizeName(resolvedProfile?.color) || undefined),
      assignedCardArtIndex:
        typeof activePlayer.assignedCardArtIndex === "number" &&
        Number.isFinite(activePlayer.assignedCardArtIndex)
          ? activePlayer.assignedCardArtIndex
          : typeof resolvedProfile?.assignedCardArtIndex === "number" &&
              Number.isFinite(resolvedProfile.assignedCardArtIndex)
            ? resolvedProfile.assignedCardArtIndex
            : null,
    });
  }

  const remappedTotals = remapTotals(input.activeGame.totals, idMap);
  const remappedRounds = remapRounds(input.activeGame.rounds, idMap);
  const remappedWinnerId = input.winnerId
    ? normalizeId(idMap[input.winnerId] ?? input.winnerId)
    : input.winnerId ?? undefined;
  const resolvedPlayerIds = resolvedPlayers.map((player) => player.id);
  const existingGroupId = resolveExistingGroupId(
    input.activeGame,
    resolvedPlayerIds,
    Array.isArray(input.groupDirectory) ? input.groupDirectory : [],
  );

  return {
    activeGame: {
      ...input.activeGame,
      groupId: existingGroupId || undefined,
      players: resolvedPlayers,
      totals: remappedTotals,
      rounds: remappedRounds,
    },
    winnerId: remappedWinnerId || undefined,
    unresolvedPlayerNames,
    createGroupRequest:
      unresolvedPlayerNames.length === 0 &&
      !existingGroupId &&
      normalizeName(input.activeGame.groupName).length > 0 &&
      resolvedPlayerIds.length >= 2
        ? {
            name: normalizeName(input.activeGame.groupName),
            playerIds: resolvedPlayerIds,
          }
        : null,
  };
}
