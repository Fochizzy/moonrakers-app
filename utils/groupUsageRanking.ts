export type GroupSortMode = "most-played" | "recent" | "az";

type GroupUsageGroup = {
  id: string;
  name: string;
  playerIds: string[];
  inferredUseCount?: number;
  inferredRecentAt?: number;
};

type GroupUsageGamePlayer =
  | string
  | {
      id?: string;
      playerId?: string;
    };

type GroupUsageGame = {
  groupId?: string;
  createdAt?: number;
  players?: GroupUsageGamePlayer[];
  totals?: Record<string, unknown>;
};

type GroupUsagePlayer = {
  name?: string;
  displayName?: string;
};

type GroupUsageRankedGroup = {
  inferredUseCount: number;
  inferredRecentAt: number;
};

type RankGroupsWithUsageOptions = {
  normalizePlayerId?: (playerId: string) => string;
};

function normalizeId(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeName(value: unknown): string {
  return String(value ?? "").trim();
}

function getGamePlayerIds(
  game: GroupUsageGame,
  normalizePlayerId: (playerId: string) => string
): string[] {
  const playerIds = Array.isArray(game.players)
    ? game.players
        .map((player) =>
          typeof player === "string"
            ? normalizeId(player)
            : normalizeId(player?.id ?? player?.playerId)
        )
        .filter(Boolean)
    : Object.keys(game.totals ?? {}).map((playerId) => normalizeId(playerId));

  return Array.from(new Set(playerIds.map(normalizePlayerId).filter(Boolean)));
}

function toComboKey(playerIds: string[], normalizePlayerId: (playerId: string) => string) {
  return Array.from(
    new Set(playerIds.map((playerId) => normalizePlayerId(playerId)).filter(Boolean))
  )
    .sort()
    .join("|");
}

function formatRelativeTime(timestamp: number): string {
  const deltaMs = Math.max(0, Date.now() - timestamp);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const weekMs = 7 * dayMs;

  if (deltaMs < hourMs) {
    const minutes = Math.max(1, Math.round(deltaMs / minuteMs));
    return `${minutes}m ago`;
  }

  if (deltaMs < dayMs) {
    const hours = Math.max(1, Math.round(deltaMs / hourMs));
    return `${hours}h ago`;
  }

  if (deltaMs < weekMs) {
    const days = Math.max(1, Math.round(deltaMs / dayMs));
    return `${days}d ago`;
  }

  const weeks = Math.max(1, Math.round(deltaMs / weekMs));
  return `${weeks}w ago`;
}

function compareByUsageThenName(
  left: GroupUsageGroup,
  right: GroupUsageGroup
): number {
  const leftUseCount = left.inferredUseCount ?? 0;
  const rightUseCount = right.inferredUseCount ?? 0;
  if (rightUseCount !== leftUseCount) {
    return rightUseCount - leftUseCount;
  }

  const leftRecentAt = left.inferredRecentAt ?? 0;
  const rightRecentAt = right.inferredRecentAt ?? 0;
  if (rightRecentAt !== leftRecentAt) {
    return rightRecentAt - leftRecentAt;
  }

  return normalizeName(left.name).localeCompare(normalizeName(right.name));
}

export function rankGroupsWithUsage<T extends GroupUsageGroup, G extends GroupUsageGame>(
  groups: T[],
  games: G[],
  options: RankGroupsWithUsageOptions = {}
): Array<T & GroupUsageRankedGroup> {
  const normalizePlayerId =
    options.normalizePlayerId ??
    ((playerId: string) => normalizeId(playerId));

  const groupUseCount: Record<string, number> = {};
  const groupRecentAt: Record<string, number> = {};
  const comboUseCount: Record<string, number> = {};
  const comboRecentAt: Record<string, number> = {};

  for (const game of games) {
    const createdAt =
      typeof game?.createdAt === "number" && Number.isFinite(game.createdAt)
        ? game.createdAt
        : 0;
    const gamePlayerIds = getGamePlayerIds(game, normalizePlayerId);
    const comboKey = toComboKey(gamePlayerIds, normalizePlayerId);
    const groupId = normalizeId(game?.groupId);

    if (groupId) {
      groupUseCount[groupId] = (groupUseCount[groupId] ?? 0) + 1;
      groupRecentAt[groupId] = Math.max(groupRecentAt[groupId] ?? 0, createdAt);
    }

    if (comboKey) {
      comboUseCount[comboKey] = (comboUseCount[comboKey] ?? 0) + 1;
      comboRecentAt[comboKey] = Math.max(comboRecentAt[comboKey] ?? 0, createdAt);
    }
  }

  return [...groups]
    .map((group) => {
      const directUseCount = groupUseCount[group.id] ?? 0;
      const directRecentAt = groupRecentAt[group.id] ?? 0;
      const comboKey = toComboKey(group.playerIds ?? [], normalizePlayerId);
      const comboCount = comboUseCount[comboKey] ?? 0;
      const comboRecent = comboRecentAt[comboKey] ?? 0;

      return {
        ...group,
        inferredUseCount: Math.max(directUseCount, comboCount),
        inferredRecentAt: Math.max(directRecentAt, comboRecent),
      };
    })
    .sort(compareByUsageThenName);
}

export function filterGroupsByQuery<T extends GroupUsageGroup>(
  groups: T[],
  query: string,
  playersById: Map<string, GroupUsagePlayer>
): T[] {
  const normalizedQuery = normalizeName(query).toLowerCase();
  if (!normalizedQuery) {
    return groups;
  }

  return groups.filter((group) => {
    const memberNames = (group.playerIds ?? [])
      .map((playerId) => playersById.get(playerId))
      .filter(Boolean)
      .map((player) => normalizeName(player?.name ?? player?.displayName))
      .join(" ");

    const haystack = `${normalizeName(group.name)} ${memberNames}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function formatGroupUsageHint(group: GroupUsageGroup): string {
  const missionCount = group.inferredUseCount ?? 0;
  const recentAt = group.inferredRecentAt ?? 0;

  if (missionCount > 0 && recentAt > 0) {
    return `${missionCount} mission${missionCount === 1 ? "" : "s"} / ${formatRelativeTime(recentAt)}`;
  }

  if (missionCount > 0) {
    return `${missionCount} mission${missionCount === 1 ? "" : "s"}`;
  }

  if (recentAt > 0) {
    return `Last used ${formatRelativeTime(recentAt)}`;
  }

  const playerCount = group.playerIds?.length ?? 0;
  return `${playerCount} player${playerCount === 1 ? "" : "s"}`;
}
