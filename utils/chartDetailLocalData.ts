import {
  buildMetricDataMap,
  buildRadarStatsForPlayer,
  buildRelationships,
  buildReplaySnapshotsFromGame,
  buildSparkSeries,
  buildUnifiedSnapshots,
  canonicalizeGames,
  collectUnifiedGames,
  normalizeMetricForChart,
  resolvePreferredChartPlayerId,
  type FlexibleStore,
  type NormalizedGame,
  type RadarStats,
  type Relationships,
  type SimpleMetricKey,
  type SnapshotPoint,
  type StackedRow,
  type StorePlayer,
} from "./charts";

export type LocalChartDetailState = {
  hasData: boolean;
  games: NormalizedGame[];
  scopedGames: NormalizedGame[];
  selectedGame: NormalizedGame | null;
  scopedPlayers: StorePlayer[];
  chartPlayers: StorePlayer[];
  selectedPlayer: StorePlayer | null;
  comparePlayer: StorePlayer | null;
  comparePlayers: StorePlayer[];
  scopedPlayerIds: string[];
  metricKey: SimpleMetricKey;
  snapshots: SnapshotPoint[];
  stackedRows: StackedRow[];
  relationships: Relationships;
  radarPrimary: RadarStats | null;
  radarComparisons: Array<{
    player: StorePlayer;
    stats: RadarStats;
  }>;
  radarComparison: RadarStats | null;
  sparklineValues: number[];
};

type BuildLocalChartDetailStateArgs = {
  chartKey: string;
  games?: unknown[];
  players?: StorePlayer[];
  routePlayerId?: string | null;
  routeCompareId?: string | null;
  routeCompareIds?: string[] | null;
  routeSelectedGameId?: string | null;
  routeIds?: string[] | null;
  routeMetric?: string | null;
  authProfileId?: string | null;
  authSessionUserId?: string | null;
};

function normalizeId(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeName(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLooseName(value: unknown) {
  return normalizeName(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ");
}

function normalizeChartPlayerNameKey(value: unknown) {
  return normalizeLooseName(value)
    .replace(/^(legacy|local)\s+/i, "")
    .trim();
}

function normalizeOptionalString(value: unknown) {
  const normalized = normalizeName(value);
  return normalized || undefined;
}

function normalizeAssignedCardArtIndex(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function looksLegacyChartPlayerId(value: unknown) {
  return /^(legacy|local)[-_ ]/i.test(normalizeId(value));
}

function looksLegacyChartPlayerName(value: unknown) {
  return /^(legacy|local)\s+/i.test(normalizeName(value));
}

function getInitialsFromName(value: string) {
  const parts = normalizeName(value).split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function compareChartPlayerPriority(
  left: StorePlayer | null | undefined,
  right: StorePlayer | null | undefined,
) {
  const leftPriority = [
    looksLegacyChartPlayerId(left?.id) ? 0 : 1,
    looksLegacyChartPlayerName(left?.name) ? 0 : 1,
    normalizeAssignedCardArtIndex(left?.assignedCardArtIndex) != null ? 1 : 0,
    normalizeOptionalString(left?.color) ? 1 : 0,
  ];
  const rightPriority = [
    looksLegacyChartPlayerId(right?.id) ? 0 : 1,
    looksLegacyChartPlayerName(right?.name) ? 0 : 1,
    normalizeAssignedCardArtIndex(right?.assignedCardArtIndex) != null ? 1 : 0,
    normalizeOptionalString(right?.color) ? 1 : 0,
  ];

  for (let index = 0; index < leftPriority.length; index += 1) {
    const delta = (rightPriority[index] ?? 0) - (leftPriority[index] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }

  return normalizeId(left?.id).localeCompare(normalizeId(right?.id));
}

function mergeChartDuplicatePlayers(
  preferred: StorePlayer,
  duplicates: StorePlayer[],
): StorePlayer | null {
  const ordered = [
    preferred,
    ...duplicates.filter((player) => normalizeId(player?.id) !== normalizeId(preferred.id)),
  ];
  const preferredId = normalizeId(preferred.id);
  if (!preferredId) {
    return null;
  }

  const preferredName =
    ordered
      .map((player) => normalizeOptionalString(player?.name))
      .find((name) => Boolean(name) && !looksLegacyChartPlayerName(name)) ??
    normalizeOptionalString(preferred.name) ??
    "Player";

  return {
    ...preferred,
    id: preferredId,
    name: preferredName,
    initials:
      ordered.map((player) => normalizeOptionalString(player?.initials)).find(Boolean) ??
      getInitialsFromName(preferredName),
    color: ordered.map((player) => normalizeOptionalString(player?.color)).find(Boolean),
    assignedCardArtIndex:
      ordered
        .map((player) => normalizeAssignedCardArtIndex(player?.assignedCardArtIndex))
        .find((value) => value != null) ?? null,
    artIndex:
      ordered
        .map((player) => normalizeAssignedCardArtIndex(player?.artIndex))
        .find((value) => value != null) ?? null,
  };
}

function buildCanonicalChartPlayers(
  players: readonly StorePlayer[],
): {
  players: StorePlayer[];
  aliases: Record<string, string>;
} {
  const groupedByName = new Map<string, StorePlayer[]>();
  const aliases: Record<string, string> = {};
  const canonicalPlayers: StorePlayer[] = [];

  for (const player of players ?? []) {
    const playerId = normalizeId(player?.id);
    if (!playerId) {
      continue;
    }

    const nameKey = normalizeChartPlayerNameKey(player?.name) || playerId;
    if (!groupedByName.has(nameKey)) {
      groupedByName.set(nameKey, []);
    }
    groupedByName.get(nameKey)?.push(player);
  }

  for (const duplicateGroup of groupedByName.values()) {
    if (duplicateGroup.length === 1) {
      const player = duplicateGroup[0];
      const playerId = normalizeId(player?.id);
      if (!playerId) {
        continue;
      }

      aliases[playerId] = playerId;
      canonicalPlayers.push({
        ...player,
        id: playerId,
        name: normalizeOptionalString(player?.name) ?? "Player",
        initials:
          normalizeOptionalString(player?.initials) ??
          getInitialsFromName(normalizeOptionalString(player?.name) ?? "Player"),
        color: normalizeOptionalString(player?.color),
        assignedCardArtIndex: normalizeAssignedCardArtIndex(player?.assignedCardArtIndex),
        artIndex: normalizeAssignedCardArtIndex(player?.artIndex),
      });
      continue;
    }

    const preferred =
      [...duplicateGroup].sort(compareChartPlayerPriority)[0] ?? duplicateGroup[0] ?? null;
    if (!preferred) {
      continue;
    }

    const mergedPlayer = mergeChartDuplicatePlayers(preferred, duplicateGroup);
    if (!mergedPlayer) {
      continue;
    }

    for (const player of duplicateGroup) {
      const playerId = normalizeId(player?.id);
      if (!playerId) {
        continue;
      }
      aliases[playerId] = mergedPlayer.id;
    }

    canonicalPlayers.push(mergedPlayer);
  }

  return {
    players: canonicalPlayers.sort((left, right) =>
      normalizeName(left?.name).localeCompare(normalizeName(right?.name)),
    ),
    aliases,
  };
}

function canonicalizeChartPlayerId(
  playerId: string | null | undefined,
  aliases: Record<string, string>,
) {
  const normalized = normalizeId(playerId);
  if (!normalized) {
    return null;
  }

  return normalizeId(aliases[normalized] ?? normalized) || null;
}

function canonicalizeChartPlayerIds(
  playerIds: readonly string[] | null | undefined,
  aliases: Record<string, string>,
) {
  const canonicalIds: string[] = [];
  const seen = new Set<string>();

  for (const playerId of playerIds ?? []) {
    const canonicalId = canonicalizeChartPlayerId(playerId, aliases);
    if (!canonicalId || seen.has(canonicalId)) {
      continue;
    }

    seen.add(canonicalId);
    canonicalIds.push(canonicalId);
  }

  return canonicalIds;
}

function defaultMetricForChart(chartKey: string): SimpleMetricKey {
  switch (chartKey) {
    case "line_chart":
    case "line":
    case "multi_line_chart":
    case "multi-line-chart":
    case "multi-line":
    case "bar_chart":
    case "bar":
      return "score";
    default:
      return "totalPrestige";
  }
}

function collectAvailablePlayers(
  players: readonly StorePlayer[],
  games: readonly NormalizedGame[],
): StorePlayer[] {
  const byId = new Map<string, StorePlayer>();

  for (const player of players ?? []) {
    const id = normalizeId(player?.id);
    if (!id) continue;
    byId.set(id, {
      ...player,
      id,
      name: String(player?.name ?? "Player"),
    });
  }

  for (const game of games ?? []) {
    for (const player of game?.players ?? []) {
      const id = normalizeId(player?.id);
      if (!id || byId.has(id)) continue;
      byId.set(id, {
        ...player,
        id,
        name: String(player?.name ?? "Player"),
      });
    }

    for (const [rawId, totals] of Object.entries(game?.totals ?? {})) {
      const id = normalizeId(rawId);
      if (!id || byId.has(id)) continue;
      byId.set(id, {
        id,
        name:
          String((totals as any)?.name ?? (totals as any)?.playerName ?? "").trim() ||
          "Player",
      });
    }
  }

  return [...byId.values()];
}

function selectPlayersInScope(
  availablePlayers: readonly StorePlayer[],
  selectedGame: NormalizedGame | null,
  routeIds: readonly string[],
): StorePlayer[] {
  if (routeIds.length > 0) {
    const allowedIds = new Set(routeIds.map(normalizeId).filter(Boolean));
    const scoped = availablePlayers.filter((player) =>
      allowedIds.has(normalizeId(player?.id)),
    );
    if (scoped.length > 0) {
      return scoped;
    }
  }

  if (selectedGame?.players?.length) {
    return selectedGame.players;
  }

  return [...availablePlayers];
}

function isRelationshipChart(chartKey: string) {
  return chartKey === "relationship_graph" || chartKey === "assist_network_overview";
}

function collectRelationshipScopeIds(
  relationships: Relationships,
  anchorPlayerId: string | null,
): string[] {
  const anchorId = normalizeId(anchorPlayerId);
  if (!anchorId) {
    return [];
  }

  const scopedIds = new Set<string>([anchorId]);

  for (const [fromIdRaw, nested] of Object.entries(relationships ?? {})) {
    const fromId = normalizeId(fromIdRaw);
    if (!fromId) {
      continue;
    }

    for (const [toIdRaw, rawValue] of Object.entries(nested ?? {})) {
      const toId = normalizeId(toIdRaw);
      const value = Number(rawValue);
      if (!toId || !Number.isFinite(value) || value <= 0) {
        continue;
      }

      if (fromId === anchorId) {
        scopedIds.add(toId);
      }

      if (toId === anchorId) {
        scopedIds.add(fromId);
      }
    }
  }

  return [...scopedIds];
}

function filterRelationshipsToScope(
  relationships: Relationships,
  scopedPlayerIds: readonly string[],
): Relationships {
  const allowedIds = new Set(scopedPlayerIds.map(normalizeId).filter(Boolean));
  if (!allowedIds.size) {
    return {};
  }

  const filtered: Relationships = {};

  for (const [fromIdRaw, nested] of Object.entries(relationships ?? {})) {
    const fromId = normalizeId(fromIdRaw);
    if (!allowedIds.has(fromId)) {
      continue;
    }

    for (const [toIdRaw, rawValue] of Object.entries(nested ?? {})) {
      const toId = normalizeId(toIdRaw);
      const value = Number(rawValue);
      if (!allowedIds.has(toId) || !Number.isFinite(value) || value <= 0) {
        continue;
      }

      if (!filtered[fromId]) {
        filtered[fromId] = {};
      }
      filtered[fromId][toId] = value;
    }
  }

  return filtered;
}

function pickComparePlayers(
  players: readonly StorePlayer[],
  selectedPlayerId: string | null,
  routeCompareIds?: readonly string[] | null,
  limit = 1,
  allowImplicitFallback = true,
): StorePlayer[] {
  const explicitCompareIds = (routeCompareIds ?? [])
    .map((playerId) => normalizeId(playerId))
    .filter(Boolean)
    .filter((playerId, index, values) => values.indexOf(playerId) === index)
    .filter((playerId) => playerId !== normalizeId(selectedPlayerId));

  if (explicitCompareIds.length > 0) {
    const explicitPlayers = explicitCompareIds
      .map((compareId) =>
        players.find((player) => normalizeId(player?.id) === compareId) ?? null,
      )
      .filter((player): player is StorePlayer => player !== null);

    if (explicitPlayers.length > 0) {
      return explicitPlayers.slice(0, Math.max(1, limit));
    }
  }

  if (!allowImplicitFallback) {
    return [];
  }

  const preferredSelectedId = normalizeId(selectedPlayerId);
  const fallback =
    players.find((player) => normalizeId(player?.id) !== preferredSelectedId) ??
    null;

  return fallback ? [fallback] : [];
}

function buildSelectedGameSnapshots(
  selectedGame: NormalizedGame | null,
  chartPlayers: readonly StorePlayer[],
): SnapshotPoint[] {
  if (!selectedGame) return [];

  const replaySnapshots = buildReplaySnapshotsFromGame(selectedGame);
  if (replaySnapshots.length > 0) {
    return replaySnapshots;
  }

  return buildUnifiedSnapshots([selectedGame], chartPlayers as StorePlayer[]);
}

export function buildLocalChartDetailState(
  args: BuildLocalChartDetailStateArgs,
): LocalChartDetailState {
  const chartKey = String(args.chartKey ?? "").trim().toLowerCase();
  const inputPlayers = Array.isArray(args.players) ? args.players : [];
  const canonicalPlayerDirectory = buildCanonicalChartPlayers(inputPlayers);
  const canonicalPlayers = canonicalPlayerDirectory.players;
  const playerIdAliases = canonicalPlayerDirectory.aliases;
  const unifiedGames = canonicalizeGames(
    collectUnifiedGames({
      games: Array.isArray(args.games) ? args.games : [],
    } as FlexibleStore),
    canonicalPlayers,
  );
  const selectedGameId = normalizeId(args.routeSelectedGameId);
  const selectedGame =
    selectedGameId.length > 0
      ? unifiedGames.find((game) => normalizeId(game?.id) === selectedGameId) ?? null
      : null;
  const availablePlayers = collectAvailablePlayers(canonicalPlayers, unifiedGames);
  const routeIds = canonicalizeChartPlayerIds(args.routeIds ?? [], playerIdAliases);
  const scopedPlayers = selectPlayersInScope(availablePlayers, selectedGame, routeIds);
  const chartPlayers =
    selectedGame?.players?.length && routeIds.length === 0
      ? selectedGame.players
      : scopedPlayers.length > 0
        ? scopedPlayers
        : selectedGame?.players?.length
          ? selectedGame.players
          : availablePlayers;
  const scopedGames = selectedGame ? [selectedGame] : unifiedGames;
  const explicitRoutePlayerId = canonicalizeChartPlayerId(
    args.routePlayerId ?? null,
    playerIdAliases,
  );
  const resolvedSelectedPlayerId = resolvePreferredChartPlayerId({
    availablePlayers: chartPlayers,
    routePlayerId: explicitRoutePlayerId,
    authProfileId: canonicalizeChartPlayerId(args.authProfileId ?? null, playerIdAliases),
    authSessionUserId: canonicalizeChartPlayerId(
      args.authSessionUserId ?? null,
      playerIdAliases,
    ),
  });
  const playersWithTrackedGames = new Set(
    scopedGames.flatMap((game) => Object.keys(game?.totals ?? {}).map(normalizeId)),
  );
  const fallbackRadarPlayerId =
    chartKey === "radar" && !explicitRoutePlayerId
      ? normalizeId(
          chartPlayers.find((player) =>
            playersWithTrackedGames.has(normalizeId(player?.id)),
          )?.id,
        ) || null
      : null;
  const resolvedPlayerIdHasTrackedGames =
    resolvedSelectedPlayerId != null &&
    playersWithTrackedGames.has(normalizeId(resolvedSelectedPlayerId));
  const selectedPlayerId =
    (chartKey === "radar" &&
    fallbackRadarPlayerId &&
    !resolvedPlayerIdHasTrackedGames
      ? fallbackRadarPlayerId
      : resolvedSelectedPlayerId) ||
    normalizeId(chartPlayers[0]?.id) ||
    null;
  const selectedPlayer =
    chartPlayers.find((player) => normalizeId(player?.id) === normalizeId(selectedPlayerId)) ??
    null;
  const routeCompareIds = canonicalizeChartPlayerIds(
    args.routeCompareIds?.length
      ? args.routeCompareIds
      : args.routeCompareId
        ? [args.routeCompareId]
        : [],
    playerIdAliases,
  );
  const comparePlayers = pickComparePlayers(
    chartPlayers,
    selectedPlayerId,
    routeCompareIds,
    chartKey === "radar" ? 4 : 1,
    chartKey !== "radar",
  );
  const comparePlayer = comparePlayers[0] ?? null;
  const metricKey =
    normalizeMetricForChart(chartKey, args.routeMetric ?? null) ??
    defaultMetricForChart(chartKey);
  const snapshots = selectedGame
    ? buildSelectedGameSnapshots(selectedGame, chartPlayers)
    : buildUnifiedSnapshots(scopedGames, chartPlayers as StorePlayer[]);
  const metricDataMap = buildMetricDataMap(
    chartPlayers as StorePlayer[],
    scopedGames,
  );
  const stackedRows =
    metricDataMap[metricKey] ??
    metricDataMap.totalPrestige ??
    [];
  const relationships = buildRelationships(
    chartPlayers as StorePlayer[],
    scopedGames,
  );
  const relationshipScopeIds =
    isRelationshipChart(chartKey)
      ? collectRelationshipScopeIds(relationships, selectedPlayerId)
      : [];
  const filteredChartPlayers =
    relationshipScopeIds.length > 0
      ? chartPlayers.filter((player) =>
          relationshipScopeIds.includes(normalizeId(player?.id)),
        )
      : chartPlayers;
  const filteredRelationships =
    relationshipScopeIds.length > 0
      ? filterRelationshipsToScope(relationships, relationshipScopeIds)
      : relationships;
  const radarPrimary = selectedPlayer
    ? buildRadarStatsForPlayer(selectedPlayer.id, scopedGames)
    : null;
  const radarComparisons = comparePlayers.map((player) => ({
    player,
    stats: buildRadarStatsForPlayer(player.id, scopedGames),
  }));
  const radarComparison = radarComparisons[0]?.stats ?? null;
  const hasRadarData =
    chartKey === "radar" &&
    selectedPlayer != null &&
    scopedGames.some((game) => Boolean(game?.totals?.[selectedPlayer.id]));
  const sparklineValues = selectedPlayer
    ? buildSparkSeries(
        snapshots,
        selectedPlayer.id,
        metricKey,
      )
    : [];

  const hasData =
    scopedGames.length > 0 &&
    filteredChartPlayers.length > 0 &&
    (hasRadarData ||
      snapshots.length > 0 ||
      stackedRows.length > 0 ||
      sparklineValues.length > 0 ||
      Object.keys(filteredRelationships).length > 0);

  return {
    hasData,
    games: unifiedGames,
    scopedGames,
    selectedGame,
    scopedPlayers,
    chartPlayers: filteredChartPlayers,
    selectedPlayer,
    comparePlayer,
    comparePlayers,
    scopedPlayerIds:
      relationshipScopeIds.length > 0
        ? relationshipScopeIds
        : chartPlayers.map((player) => normalizeId(player.id)).filter(Boolean),
    metricKey,
    snapshots,
    stackedRows,
    relationships: filteredRelationships,
    radarPrimary,
    radarComparisons,
    radarComparison,
    sparklineValues,
  };
}
