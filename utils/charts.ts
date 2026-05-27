export type SimpleMetricKey =
  | "score"
  | "totalPrestige"
  | "prestige"
  | "directPrestige"
  | "assistPrestigeReceived"
  | "objectivePrestige"
  | "assists"
  | "contracts"
  | "failures"
  | "turns"
  | "efficiency"
  | "assistEfficiency"
  | "directEfficiency"
  | "contractSuccessRate"
  | "netPrestige"
  | "supportBalance";

export type ReplayMetricKey =
  | "totalPrestige"
  | "score"
  | "directPrestige"
  | "assistPrestigeReceived"
  | "assists"
  | "contracts"
  | "failures";

export type FlexibleStore = {
  games?: any[];
  importedGames?: any[];
};

export type StorePlayer = {
  id: string;
  name?: string;
  color?: string;
  initials?: string;
  assignedCardArtIndex?: number | null;
  artIndex?: number | null;
};

export type PlayerTotals = {
  score?: number;
  totalPrestige?: number;
  prestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeSent?: number;
  objectivePrestige?: number;
  objectiveCount?: number;
  assists?: number;
  assistCountBySource?: Record<string, number>;
  contracts?: number;
  failures?: number;
  turns?: number;
  turnCount?: number;
  efficiency?: number;
  assistEfficiency?: number;
  directEfficiency?: number;
  assistedEfficiency?: number;
  assistPrestigeBySource?: Record<string, number>;
  assistPrestigeByPlayer?: Record<string, number>;
  assistPrestigeFromPlayers?: Record<string, number>;
  assistSources?: Record<string, number>;
  wins?: number;
  name?: string;
  playerName?: string;
  rawPlayerId?: string;
  canonicalPlayerId?: string;
};

export type NormalizedPlayer = StorePlayer & {
  id: string;
  name: string;
  initials: string;
};

export type NormalizedRound = {
  id: string;
  playerId: string;
  prestige: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  objectivePrestige: number;
  contracts: number;
  failures: number;
  assists: number;
  createdAt: number;
  assistRecipients: Record<string, number>;
  assistPrestigeRecipients: Record<string, number>;
};

export type NormalizedGame = {
  id: string;
  createdAt: number;
  players: NormalizedPlayer[];
  totals: Record<string, PlayerTotals>;
  rounds: NormalizedRound[];
  timeline: NormalizedRound[];
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  roundCount?: number;
};

export type RadarStats = {
  finisher: number;
  starter: number;
  supporter: number;
  receiver: number;
  stability: number;
  efficiency: number;
  risk: number;
  conversion: number;
};

export type SnapshotPoint = {
  round: number;
  gameIndex: number;
  label: string;
  snapshot: Record<string, Record<string, number | string>>;
};

export type StackedRow = {
  id: string;
  label: string;
  color?: string;
  segments: Array<{
    key: string;
    label: string;
    value: number;
    color?: string;
  }>;
};

export type Relationships = Record<string, Record<string, number>>;

export type CommonOpponentOption = StorePlayer & {
  gamesPlayed: number;
};

type SignedInComparableOption = {
  id?: unknown;
  name?: unknown;
  label?: unknown;
  displayName?: unknown;
  playerName?: unknown;
};

export type MetricOption = {
  key: SimpleMetricKey;
  label: string;
};

export const METRIC_OPTIONS: SimpleMetricKey[] = [
  "score",
  "totalPrestige",
  "prestige",
  "directPrestige",
  "assistPrestigeReceived",
  "objectivePrestige",
  "assists",
  "contracts",
  "failures",
  "turns",
  "efficiency",
  "assistEfficiency",
  "directEfficiency",
  "contractSuccessRate",
  "netPrestige",
  "supportBalance",
];

export const REPLAY_METRICS: ReplayMetricKey[] = [
  "totalPrestige",
  "score",
  "directPrestige",
  "assistPrestigeReceived",
  "assists",
  "contracts",
  "failures",
];

const REPLAY_CHART_KEYS = new Set(["replay_chart", "replay"]);
const FULL_METRIC_CHART_KEYS = new Set([
  "bar_chart",
  "bar",
  "bump_chart",
  "consistency_band",
  "heatmap",
  "line_chart",
  "line",
  "multi_line_chart",
  "multi-line-chart",
  "multi-line",
  "prestige_over_time",
  "sparkline",
]);
const STACKED_METRIC_CHART_KEYS = new Set(["stacked_bar_chart"]);

const STACKED_COLORS: Record<string, string> = {
  directPrestige: "#3B82F6",
  assistPrestigeReceived: "#A855F7",
  objectivePrestige: "#22C55E",
  score: "#14B8A6",
  contracts: "#22C55E",
  failures: "#EF4444",
  assists: "#A855F7",
};

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Number(value) || 0;
}

function ensureObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function normalizeLooseName(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ");
}

function normalizeLegacyAwareNameKey(value: unknown): string {
  return normalizeLooseName(value)
    .replace(/^(legacy|local)\s+/i, "")
    .trim();
}

function normalizeId(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeChartKey(chartKey?: string | null): string {
  return String(chartKey ?? "").trim().toLowerCase();
}

function collectComparableNameKeys(option: SignedInComparableOption | null | undefined) {
  return [
    normalizeLooseName(option?.name),
    normalizeLooseName(option?.label),
    normalizeLooseName(option?.displayName),
    normalizeLooseName(option?.playerName),
  ].filter(Boolean);
}

function getInitials(player: any): string {
  const explicit = String(player?.initials ?? "").trim();
  if (explicit) return explicit.charAt(0).toUpperCase();

  const name = String(player?.name ?? "").trim();
  return name ? name.charAt(0).toUpperCase() : "?";
}

function normalizeAssistMap(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};

  const out: Record<string, number> = {};
  for (const [rawKey, rawValue] of Object.entries(input as Record<string, unknown>)) {
    const key = String(rawKey ?? "").trim();
    if (!key) continue;
    out[key] = toNumber(rawValue);
  }
  return out;
}

function totalPrestigeFromTotals(totals?: PlayerTotals | null): number {
  if (!totals) return 0;

  return (
    toNumber(totals.totalPrestige) ||
    toNumber(totals.prestige) ||
    toNumber(totals.directPrestige) +
      toNumber(totals.assistPrestigeReceived) +
      toNumber(totals.objectivePrestige ?? totals.objectiveCount)
  );
}

function getMetricValue(
  totals: PlayerTotals | undefined,
  metricKey: SimpleMetricKey | ReplayMetricKey
): number {
  const directPrestige = toNumber(totals?.directPrestige);
  const assistPrestigeReceived = toNumber(totals?.assistPrestigeReceived);
  const objectivePrestige = toNumber(
    totals?.objectivePrestige ?? totals?.objectiveCount
  );
  const contracts = toNumber(totals?.contracts);
  const failures = toNumber(totals?.failures);
  const assists = toNumber(totals?.assists);
  const turns = toNumber(totals?.turns ?? totals?.turnCount);
  const totalPrestige = totalPrestigeFromTotals(totals);
  const score = toNumber(totals?.score) || totalPrestige;

  switch (metricKey) {
    case "score":
      return score;
    case "totalPrestige":
      return totalPrestige;
    case "prestige":
      return toNumber(totals?.prestige) || totalPrestige;
    case "directPrestige":
      return directPrestige;
    case "assistPrestigeReceived":
      return assistPrestigeReceived;
    case "objectivePrestige":
      return objectivePrestige;
    case "assists":
      return assists;
    case "contracts":
      return contracts;
    case "failures":
      return failures;
    case "turns":
      return turns;
    case "efficiency":
      return toNumber(totals?.efficiency) || (turns > 0 ? score / turns : 0);
    case "assistEfficiency":
      return (
        toNumber(totals?.assistEfficiency) ||
        toNumber(totals?.assistedEfficiency) ||
        (turns > 0 ? assistPrestigeReceived / turns : 0)
      );
    case "directEfficiency":
      return (
        toNumber(totals?.directEfficiency) ||
        (turns > 0 ? directPrestige / turns : 0)
      );
    case "contractSuccessRate": {
      const attempts = contracts + failures;
      return attempts > 0 ? (contracts / attempts) * 100 : 0;
    }
    case "netPrestige":
      return directPrestige + assistPrestigeReceived + objectivePrestige;
    case "supportBalance":
      return assistPrestigeReceived - directPrestige;
    default:
      return 0;
  }
}

function normalizeRound(round: any, fallbackIndex: number): NormalizedRound | null {
  const playerId = String(round?.playerId ?? "").trim();
  if (!playerId) return null;

  const directPrestige =
    toNumber(round?.directPrestige) ||
    toNumber(round?.prestige);

  return {
    id: String(round?.id ?? `round-${fallbackIndex + 1}`),
    playerId,
    prestige: toNumber(round?.prestige) || directPrestige,
    directPrestige,
    assistPrestigeReceived: toNumber(round?.assistPrestigeReceived),
    objectivePrestige: toNumber(round?.objectivePrestige ?? round?.objectiveCount),
    contracts: toNumber(round?.contracts),
    failures: toNumber(round?.failures),
    assists: toNumber(round?.assists),
    createdAt: toNumber(round?.createdAt),
    assistRecipients: normalizeAssistMap(round?.assistRecipients),
    assistPrestigeRecipients: normalizeAssistMap(round?.assistPrestigeRecipients),
  };
}

function normalizePlayer(player: any, fallbackIndex: number): NormalizedPlayer | null {
  const id = String(player?.id ?? player?.playerId ?? "").trim();
  const name = String(player?.name ?? "").trim();
  if (!id && !name) return null;

  return {
    ...player,
    id: id || `player-${fallbackIndex + 1}`,
    name: name || "Player",
    initials: getInitials(player),
    color: typeof player?.color === "string" ? player.color : undefined,
    assignedCardArtIndex:
      typeof player?.assignedCardArtIndex === "number" &&
      Number.isFinite(player.assignedCardArtIndex)
        ? player.assignedCardArtIndex
        : null,
    artIndex:
      typeof player?.artIndex === "number" && Number.isFinite(player.artIndex)
        ? player.artIndex
        : null,
  };
}

export function normalizeStoreGames(store: FlexibleStore): NormalizedGame[] {
  const merged = [
    ...(Array.isArray(store?.games) ? store.games : []),
    ...(Array.isArray(store?.importedGames) ? store.importedGames : []),
  ];

  return merged
    .filter(Boolean)
    .map((game: any, index: number) => {
      const players = (Array.isArray(game?.players) ? game.players : [])
        .map((player: any, playerIndex: number) => normalizePlayer(player, playerIndex))
        .filter((player: NormalizedPlayer | null): player is NormalizedPlayer => Boolean(player));

      const rounds = (Array.isArray(game?.rounds) ? game.rounds : [])
        .map((round: any, roundIndex: number) => normalizeRound(round, roundIndex))
        .filter((round: NormalizedRound | null): round is NormalizedRound => Boolean(round));

      const timelineSource =
        Array.isArray(game?.timeline) && game.timeline.length > 0
          ? game.timeline
          : rounds;

      const timeline = (Array.isArray(timelineSource) ? timelineSource : [])
        .map((round: any, roundIndex: number) => normalizeRound(round, roundIndex))
        .filter((round: NormalizedRound | null): round is NormalizedRound => Boolean(round));

      return {
        ...game,
        id: String(game?.id ?? `game-${index + 1}`),
        createdAt: toNumber(game?.createdAt) || index + 1,
        players,
        totals: ensureObject(game?.totals),
        rounds,
        timeline,
        winnerId: typeof game?.winnerId === "string" ? game.winnerId : undefined,
        selectedWinnerId:
          typeof game?.selectedWinnerId === "string" ? game.selectedWinnerId : undefined,
        manualWinnerId:
          typeof game?.manualWinnerId === "string" ? game.manualWinnerId : undefined,
        roundCount: toNumber(game?.roundCount) || rounds.length || timeline.length,
      } as NormalizedGame;
    })
    .filter((game) => game.players.length > 0 || Object.keys(game.totals).length > 0);
}

export function collectUnifiedGames(store: FlexibleStore): NormalizedGame[] {
  return normalizeStoreGames(store);
}

export function getPlayerById(players: StorePlayer[], id?: string | null) {
  if (!id) return null;
  return (players ?? []).find((player) => String(player.id) === String(id)) ?? null;
}

export function resolvePreferredChartPlayerId(args: {
  availablePlayers: StorePlayer[];
  routePlayerId?: string | null;
  authProfileId?: string | null;
  authSessionUserId?: string | null;
}) {
  const {
    availablePlayers,
    routePlayerId,
    authProfileId,
    authSessionUserId,
  } = args;

  const availableIds = new Set(
    (availablePlayers ?? [])
      .map((player) => normalizeId(player?.id))
      .filter(Boolean),
  );

  const explicitRouteId = normalizeId(routePlayerId);
  if (explicitRouteId && availableIds.has(explicitRouteId)) {
    return explicitRouteId;
  }

  const profileId = normalizeId(authProfileId);
  if (profileId && availableIds.has(profileId)) {
    return profileId;
  }

  const sessionUserId = normalizeId(authSessionUserId);
  if (sessionUserId && availableIds.has(sessionUserId)) {
    return sessionUserId;
  }

  return availablePlayers?.[0]?.id ? normalizeId(availablePlayers[0].id) : null;
}

export function resolveSignedInPlayerOptionId(args: {
  options: SignedInComparableOption[];
  authProfileId?: string | null;
  authSessionUserId?: string | null;
  authProfilePlayer?: SignedInComparableOption | null;
}) {
  const {
    options,
    authProfileId,
    authSessionUserId,
    authProfilePlayer,
  } = args;

  const normalizedAuthIds = [
    normalizeId(authProfileId),
    normalizeId(authSessionUserId),
    normalizeId(authProfilePlayer?.id),
  ].filter(Boolean);

  const matchedById = (options ?? []).find((option) =>
    normalizedAuthIds.includes(normalizeId(option?.id))
  );
  if (matchedById) {
    return normalizeId(matchedById.id);
  }

  const authNameKeys = collectComparableNameKeys(authProfilePlayer);
  if (authNameKeys.length > 0) {
    const matchedByName = (options ?? []).find((option) => {
      const optionNameKeys = collectComparableNameKeys(option);
      return optionNameKeys.some((optionNameKey) => authNameKeys.includes(optionNameKey));
    });

    if (matchedByName) {
      return normalizeId(matchedByName.id);
    }
  }

  return normalizedAuthIds[0] ?? null;
}

export function prioritizeSignedInPlayerOptions(args: {
  players: StorePlayer[];
  games: NormalizedGame[];
  authProfileId?: string | null;
  authSessionUserId?: string | null;
  authProfilePlayer?: StorePlayer | null;
  commonPlayerLimit?: number;
  explicitPriorityPlayerIds?: Array<string | null | undefined>;
}): StorePlayer[] {
  const {
    players,
    games,
    authProfileId,
    authSessionUserId,
    authProfilePlayer,
    commonPlayerLimit = 4,
    explicitPriorityPlayerIds = [],
  } = args;

  const signedInPlayerId = resolveSignedInPlayerOptionId({
    options: players,
    authProfileId,
    authSessionUserId,
    authProfilePlayer,
  });

  const playersById = new Map<string, StorePlayer>();
  for (const player of players ?? []) {
    const normalizedPlayerId = normalizeId(player?.id);
    if (!normalizedPlayerId || playersById.has(normalizedPlayerId)) {
      continue;
    }

    playersById.set(normalizedPlayerId, player);
  }

  if (
    signedInPlayerId &&
    !playersById.has(signedInPlayerId) &&
    normalizeId(authProfilePlayer?.id) === signedInPlayerId
  ) {
    playersById.set(signedInPlayerId, {
      ...authProfilePlayer,
      id: signedInPlayerId,
    });
  }

  const alphabetizedPlayers = [...playersById.values()].sort((left, right) =>
    String(left?.name ?? "").localeCompare(String(right?.name ?? ""))
  );

  if (!signedInPlayerId) {
    return alphabetizedPlayers;
  }

  const prioritizedIds = new Set<string>([signedInPlayerId]);
  const explicitPriorityIds = explicitPriorityPlayerIds
    .map((playerId) => normalizeId(playerId))
    .filter(
      (playerId, index, allIds) =>
        Boolean(playerId) &&
        playerId !== signedInPlayerId &&
        playersById.has(playerId) &&
        allIds.indexOf(playerId) === index,
    );
  const fallbackCommonPlayerIds = buildCommonOpponentOptions({
    playerId: signedInPlayerId,
    players: alphabetizedPlayers,
    games,
    limit: Math.max(0, commonPlayerLimit),
  }).map((player) => normalizeId(player.id));
  const commonPlayerIds = [...explicitPriorityIds];

  for (const fallbackCommonPlayerId of fallbackCommonPlayerIds) {
    if (
      !fallbackCommonPlayerId ||
      fallbackCommonPlayerId === signedInPlayerId ||
      commonPlayerIds.includes(fallbackCommonPlayerId)
    ) {
      continue;
    }

    commonPlayerIds.push(fallbackCommonPlayerId);
    if (commonPlayerIds.length >= Math.max(0, commonPlayerLimit)) {
      break;
    }
  }

  for (const commonPlayerId of commonPlayerIds) {
    if (!commonPlayerId || prioritizedIds.has(commonPlayerId)) {
      continue;
    }

    prioritizedIds.add(commonPlayerId);
  }

  const prioritizedPlayers = [
    ...alphabetizedPlayers.filter((player) =>
      prioritizedIds.has(normalizeId(player?.id))
    ),
  ].sort((left, right) => {
    const leftId = normalizeId(left?.id);
    const rightId = normalizeId(right?.id);

    if (leftId === signedInPlayerId && rightId !== signedInPlayerId) {
      return -1;
    }

    if (leftId !== signedInPlayerId && rightId === signedInPlayerId) {
      return 1;
    }

    const leftIndex = commonPlayerIds.indexOf(leftId);
    const rightIndex = commonPlayerIds.indexOf(rightId);

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return String(left?.name ?? "").localeCompare(String(right?.name ?? ""));
  });

  const remainingPlayers = alphabetizedPlayers.filter(
    (player) => !prioritizedIds.has(normalizeId(player?.id))
  );

  return [...prioritizedPlayers, ...remainingPlayers];
}

export function buildCommonOpponentOptions(args: {
  playerId?: string | null;
  players: StorePlayer[];
  games: NormalizedGame[];
  limit?: number;
}): CommonOpponentOption[] {
  const { playerId, players, games, limit = 5 } = args;
  const focusPlayerId = normalizeId(playerId);

  if (!focusPlayerId) {
    return [];
  }

  const playerMap = new Map<string, StorePlayer>();
  for (const player of players ?? []) {
    const normalizedId = normalizeId(player?.id);
    if (!normalizedId) continue;
    playerMap.set(normalizedId, player);
  }

  const opponentCounts = new Map<string, number>();

  for (const game of games ?? []) {
    const gamePlayerIds = new Set<string>();

    for (const player of Array.isArray(game?.players) ? game.players : []) {
      const normalizedId = normalizeId(player?.id);
      if (normalizedId) {
        gamePlayerIds.add(normalizedId);
      }
    }

    for (const rawId of Object.keys(game?.totals ?? {})) {
      const normalizedId = normalizeId(rawId);
      if (normalizedId) {
        gamePlayerIds.add(normalizedId);
      }
    }

    if (!gamePlayerIds.has(focusPlayerId)) {
      continue;
    }

    gamePlayerIds.delete(focusPlayerId);

    for (const opponentId of gamePlayerIds) {
      if (!playerMap.has(opponentId)) {
        continue;
      }

      opponentCounts.set(
        opponentId,
        toNumber(opponentCounts.get(opponentId)) + 1,
      );
    }
  }

  return [...opponentCounts.entries()]
    .map(([id, gamesPlayed]): CommonOpponentOption | null => {
      const player = playerMap.get(id);
      return player
        ? {
            id: String(player.id ?? id),
            name: player.name,
            color: player.color,
            initials: player.initials,
            assignedCardArtIndex:
              typeof player.assignedCardArtIndex === "number" &&
              Number.isFinite(player.assignedCardArtIndex)
                ? player.assignedCardArtIndex
                : null,
            artIndex:
              typeof player.artIndex === "number" &&
              Number.isFinite(player.artIndex)
                ? player.artIndex
                : null,
            gamesPlayed,
          }
        : null;
    })
    .filter((player): player is CommonOpponentOption => player !== null)
    .sort((left, right) => {
      if (right.gamesPlayed !== left.gamesPlayed) {
        return right.gamesPlayed - left.gamesPlayed;
      }

      const leftName = String(left.name ?? left.id ?? "").trim();
      const rightName = String(right.name ?? right.id ?? "").trim();
      return leftName.localeCompare(rightName);
    })
    .slice(0, Math.max(0, limit));
}

export function buildRecentGameOpponentOptions(args: {
  playerId?: string | null;
  players: StorePlayer[];
  recentGames: Array<Record<string, any>>;
  limit?: number;
}): CommonOpponentOption[] {
  const { playerId, players, recentGames, limit = 5 } = args;
  const focusPlayerId = normalizeId(playerId);

  if (!focusPlayerId) {
    return [];
  }

  const playerMap = new Map<string, StorePlayer>();
  for (const player of players ?? []) {
    const normalizedId = normalizeId(player?.id);
    if (!normalizedId || playerMap.has(normalizedId)) continue;
    playerMap.set(normalizedId, player);
  }

  const opponentCounts = new Map<string, number>();

  for (const game of recentGames ?? []) {
    const gamePlayers = Array.isArray(game?.players) ? game.players : [];
    const seenGamePlayerIds = new Set<string>();
    let includesFocusPlayer = false;

    for (const gamePlayer of gamePlayers) {
      const normalizedId = normalizeId(gamePlayer?.id ?? gamePlayer?.profileId);
      if (!normalizedId || seenGamePlayerIds.has(normalizedId)) {
        continue;
      }

      seenGamePlayerIds.add(normalizedId);

      if (!playerMap.has(normalizedId)) {
        playerMap.set(normalizedId, {
          id: normalizedId,
          name:
            String(gamePlayer?.name ?? gamePlayer?.displayName ?? gamePlayer?.playerName ?? "").trim() ||
            "Player",
          color: typeof gamePlayer?.color === "string" ? gamePlayer.color : undefined,
          assignedCardArtIndex:
            typeof gamePlayer?.assignedCardArtIndex === "number" &&
            Number.isFinite(gamePlayer.assignedCardArtIndex)
              ? gamePlayer.assignedCardArtIndex
              : null,
        });
      }

      if (normalizedId === focusPlayerId) {
        includesFocusPlayer = true;
      }
    }

    if (!includesFocusPlayer) {
      continue;
    }

    seenGamePlayerIds.delete(focusPlayerId);
    for (const opponentId of seenGamePlayerIds) {
      opponentCounts.set(opponentId, toNumber(opponentCounts.get(opponentId)) + 1);
    }
  }

  return [...opponentCounts.entries()]
    .map(([id, gamesPlayed]): CommonOpponentOption | null => {
      const player = playerMap.get(id);
      return player
        ? {
            id: String(player.id ?? id),
            name: player.name,
            color: player.color,
            initials: player.initials,
            assignedCardArtIndex:
              typeof player.assignedCardArtIndex === "number" &&
              Number.isFinite(player.assignedCardArtIndex)
                ? player.assignedCardArtIndex
                : null,
            artIndex:
              typeof player.artIndex === "number" &&
              Number.isFinite(player.artIndex)
                ? player.artIndex
                : null,
            gamesPlayed,
          }
        : null;
    })
    .filter((player): player is CommonOpponentOption => player !== null)
    .sort((left, right) => {
      if (right.gamesPlayed !== left.gamesPlayed) {
        return right.gamesPlayed - left.gamesPlayed;
      }

      const leftName = String(left.name ?? left.id ?? "").trim();
      const rightName = String(right.name ?? right.id ?? "").trim();
      return leftName.localeCompare(rightName);
    })
    .slice(0, Math.max(0, limit));
}

function createPlayerMatcher(players: StorePlayer[]) {
  const byId = new Map<string, StorePlayer>();
  const byName = new Map<string, StorePlayer>();
  const byLegacyAwareName = new Map<string, StorePlayer>();

  for (const player of players ?? []) {
    const id = String(player?.id ?? "").trim();
    const nameKey = normalizeLooseName(player?.name);
    const legacyAwareNameKey = normalizeLegacyAwareNameKey(player?.name);
    if (id) byId.set(id, player);
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, player);
    if (legacyAwareNameKey && !byLegacyAwareName.has(legacyAwareNameKey)) {
      byLegacyAwareName.set(legacyAwareNameKey, player);
    }
  }

  return {
    resolve(rawPlayer: any, totalsEntry?: any): StorePlayer | null {
      const rawId = String(rawPlayer?.id ?? rawPlayer?.playerId ?? "").trim();
      const rawNameKey = normalizeLooseName(rawPlayer?.name);
      const rawLegacyAwareNameKey = normalizeLegacyAwareNameKey(rawPlayer?.name);
      const totalsNameKey = normalizeLooseName(totalsEntry?.name ?? totalsEntry?.playerName);
      const totalsLegacyAwareNameKey = normalizeLegacyAwareNameKey(
        totalsEntry?.name ?? totalsEntry?.playerName
      );

      if (rawId && byId.has(rawId)) return byId.get(rawId)!;
      if (rawNameKey && byName.has(rawNameKey)) return byName.get(rawNameKey)!;
      if (totalsNameKey && byName.has(totalsNameKey)) return byName.get(totalsNameKey)!;
      if (rawLegacyAwareNameKey && byLegacyAwareName.has(rawLegacyAwareNameKey)) {
        return byLegacyAwareName.get(rawLegacyAwareNameKey)!;
      }
      if (
        totalsLegacyAwareNameKey &&
        byLegacyAwareName.has(totalsLegacyAwareNameKey)
      ) {
        return byLegacyAwareName.get(totalsLegacyAwareNameKey)!;
      }

      return null;
    },
  };
}

function mapAssistSourceKeys(
  input: Record<string, number>,
  idMap: Record<string, string>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [rawKey, rawValue] of Object.entries(input ?? {})) {
    const canonicalKey = idMap[String(rawKey)] ?? String(rawKey);
    out[canonicalKey] = toNumber(out[canonicalKey]) + toNumber(rawValue);
  }
  return out;
}

function normalizeTotalsEntry(
  entry: any,
  rawPlayerId: string,
  canonicalPlayerId: string,
  idMap: Record<string, string>
): PlayerTotals {
  const directPrestige = toNumber(entry?.directPrestige);
  const assistPrestigeReceived = toNumber(entry?.assistPrestigeReceived);
  const objectivePrestige = toNumber(entry?.objectivePrestige ?? entry?.objectiveCount);
  const totalPrestige =
    toNumber(entry?.totalPrestige) ||
    toNumber(entry?.prestige) ||
    directPrestige + assistPrestigeReceived + objectivePrestige;

  const turns = toNumber(entry?.turns ?? entry?.turnCount);

  const assistMapRaw = normalizeAssistMap(
    entry?.assistPrestigeBySource ??
    entry?.assistPrestigeByPlayer ??
    entry?.assistPrestigeFromPlayers ??
    entry?.assistSources
  );
  const assistCountMapRaw = normalizeAssistMap(entry?.assistCountBySource);

  const assistPrestigeBySource = mapAssistSourceKeys(assistMapRaw, idMap);
  const assistCountBySource = mapAssistSourceKeys(assistCountMapRaw, idMap);

  return {
    ...entry,
    score: toNumber(entry?.score) || totalPrestige,
    totalPrestige,
    prestige: toNumber(entry?.prestige) || totalPrestige,
    directPrestige,
    assistPrestigeReceived,
    assistPrestigeSent: toNumber(entry?.assistPrestigeSent),
    objectivePrestige,
    objectiveCount: objectivePrestige,
    assists: toNumber(entry?.assists),
    contracts: toNumber(entry?.contracts),
    failures: toNumber(entry?.failures),
    turns,
    turnCount: turns,
    efficiency: toNumber(entry?.efficiency) || (turns > 0 ? totalPrestige / turns : 0),
    assistEfficiency:
      toNumber(entry?.assistEfficiency) ||
      toNumber(entry?.assistedEfficiency) ||
      (turns > 0 ? assistPrestigeReceived / turns : 0),
    directEfficiency:
      toNumber(entry?.directEfficiency) ||
      (turns > 0 ? directPrestige / turns : 0),
    assistPrestigeBySource,
    assistPrestigeByPlayer: assistPrestigeBySource,
    assistPrestigeFromPlayers: assistPrestigeBySource,
    assistSources: assistPrestigeBySource,
    assistCountBySource,
    name: entry?.name,
    playerName: entry?.playerName,
    rawPlayerId,
    canonicalPlayerId,
  };
}

function mergeAssistMaps(...maps: Array<Record<string, number> | undefined>) {
  const out: Record<string, number> = {};
  for (const map of maps) {
    for (const [key, value] of Object.entries(map ?? {})) {
      out[key] = toNumber(out[key]) + toNumber(value);
    }
  }
  return out;
}

function mergeTotalsEntry(existing: PlayerTotals | undefined, incoming: PlayerTotals): PlayerTotals {
  const a = ensureObject(existing);
  const b = ensureObject(incoming);

  const directPrestige = toNumber(a.directPrestige) + toNumber(b.directPrestige);
  const assistPrestigeReceived =
    toNumber(a.assistPrestigeReceived) + toNumber(b.assistPrestigeReceived);
  const objectivePrestige =
    toNumber(a.objectivePrestige ?? a.objectiveCount) +
    toNumber(b.objectivePrestige ?? b.objectiveCount);
  const turns = toNumber(a.turns ?? a.turnCount) + toNumber(b.turns ?? b.turnCount);
  const totalPrestige = directPrestige + assistPrestigeReceived + objectivePrestige;

  return {
    ...a,
    ...b,
    name: a.name ?? b.name,
    playerName: a.playerName ?? b.playerName,
    score: toNumber(a.score) + toNumber(b.score),
    totalPrestige,
    prestige: totalPrestige,
    directPrestige,
    assistPrestigeReceived,
    assistPrestigeSent: toNumber(a.assistPrestigeSent) + toNumber(b.assistPrestigeSent),
    objectivePrestige,
    objectiveCount: objectivePrestige,
    assists: toNumber(a.assists) + toNumber(b.assists),
    contracts: toNumber(a.contracts) + toNumber(b.contracts),
    failures: toNumber(a.failures) + toNumber(b.failures),
    turns,
    turnCount: turns,
    efficiency: turns > 0 ? totalPrestige / turns : 0,
    assistEfficiency: turns > 0 ? assistPrestigeReceived / turns : 0,
    directEfficiency: turns > 0 ? directPrestige / turns : 0,
    assistPrestigeBySource: mergeAssistMaps(
      a.assistPrestigeBySource,
      b.assistPrestigeBySource
    ),
    assistPrestigeByPlayer: mergeAssistMaps(
      a.assistPrestigeByPlayer,
      b.assistPrestigeByPlayer
    ),
    assistPrestigeFromPlayers: mergeAssistMaps(
      a.assistPrestigeFromPlayers,
      b.assistPrestigeFromPlayers
    ),
    assistSources: mergeAssistMaps(a.assistSources, b.assistSources),
    assistCountBySource: mergeAssistMaps(
      a.assistCountBySource,
      b.assistCountBySource
    ),
  };
}

function canonicalizeGameAgainstPlayers(
  game: NormalizedGame,
  players: StorePlayer[]
): NormalizedGame {
  if (!players?.length) return game;

  const matcher = createPlayerMatcher(players);
  const idMap: Record<string, string> = {};
  const canonicalPlayers: NormalizedPlayer[] = [];
  const canonicalTotals: Record<string, PlayerTotals> = {};

  for (const rawPlayer of game.players ?? []) {
    const directTotals = ensureObject(game.totals?.[rawPlayer.id]);
    const matched = matcher.resolve(rawPlayer, directTotals);
    const canonicalId = String(matched?.id ?? rawPlayer.id).trim();
    idMap[rawPlayer.id] = canonicalId;

    canonicalPlayers.push({
      ...rawPlayer,
      id: canonicalId,
      name: String(matched?.name ?? rawPlayer.name ?? "Player"),
      color: matched?.color ?? rawPlayer.color,
      initials: String(matched?.initials ?? rawPlayer.initials ?? getInitials(rawPlayer)),
      assignedCardArtIndex:
        typeof matched?.assignedCardArtIndex === "number"
          ? matched.assignedCardArtIndex
          : rawPlayer.assignedCardArtIndex ?? null,
      artIndex:
        typeof matched?.artIndex === "number"
          ? matched.artIndex
          : rawPlayer.artIndex ?? null,
    });
  }

  for (const [rawPlayerId, rawEntry] of Object.entries(game.totals ?? {})) {
    const entry = ensureObject(rawEntry);
    const linkedPlayer =
      (game.players ?? []).find((player) => String(player.id) === String(rawPlayerId)) ??
      null;
    const matched = matcher.resolve(linkedPlayer ?? { id: rawPlayerId }, entry);
    const canonicalId = String(
      matched?.id ?? idMap[String(rawPlayerId)] ?? String(rawPlayerId)
    ).trim();

    idMap[String(rawPlayerId)] = canonicalId;

    const normalizedEntry = normalizeTotalsEntry(entry, String(rawPlayerId), canonicalId, idMap);
    canonicalTotals[canonicalId] = mergeTotalsEntry(
      canonicalTotals[canonicalId],
      normalizedEntry
    );
  }

  const canonicalRounds = (game.rounds ?? []).map((round, index) => ({
    ...round,
    id: String(round?.id ?? `round-${index + 1}`),
    playerId: idMap[String(round.playerId)] ?? String(round.playerId),
    assistRecipients: mapAssistSourceKeys(
      normalizeAssistMap(round.assistRecipients),
      idMap
    ),
    assistPrestigeRecipients: mapAssistSourceKeys(
      normalizeAssistMap(round.assistPrestigeRecipients),
      idMap
    ),
  }));

  const canonicalTimeline = (game.timeline ?? []).map((round, index) => ({
    ...round,
    id: String(round?.id ?? `timeline-${index + 1}`),
    playerId: idMap[String(round.playerId)] ?? String(round.playerId),
    assistRecipients: mapAssistSourceKeys(
      normalizeAssistMap(round.assistRecipients),
      idMap
    ),
    assistPrestigeRecipients: mapAssistSourceKeys(
      normalizeAssistMap(round.assistPrestigeRecipients),
      idMap
    ),
  }));

  const seenPlayers = new Map<string, NormalizedPlayer>();
  for (const player of canonicalPlayers) {
    if (!seenPlayers.has(player.id)) {
      seenPlayers.set(player.id, player);
    }
  }

  for (const player of players) {
    const id = String(player?.id ?? "").trim();
    if (id && !seenPlayers.has(id) && canonicalTotals[id]) {
      seenPlayers.set(id, {
        ...player,
        id,
        name: String(player?.name ?? "Player"),
        initials: getInitials(player),
      });
    }
  }

  const remapWinnerId = (value?: string) => {
    const raw = String(value ?? "").trim();
    if (!raw) return undefined;
    return idMap[raw] ?? raw;
  };

  return {
    ...game,
    players: [...seenPlayers.values()],
    totals: canonicalTotals,
    rounds: canonicalRounds,
    timeline: canonicalTimeline.length > 0 ? canonicalTimeline : canonicalRounds,
    winnerId: remapWinnerId(game.winnerId),
    selectedWinnerId: remapWinnerId(game.selectedWinnerId),
    manualWinnerId: remapWinnerId(game.manualWinnerId),
  };
}

export function canonicalizeGames(
  games: NormalizedGame[],
  players: StorePlayer[]
): NormalizedGame[] {
  return (Array.isArray(games) ? games : []).map((game, index) => {
    const normalized = {
      ...game,
      id: String(game?.id ?? `game-${index + 1}`),
      createdAt: toNumber(game?.createdAt) || index + 1,
      players: Array.isArray(game?.players) ? game.players : [],
      totals: ensureObject(game?.totals),
      rounds: Array.isArray(game?.rounds) ? game.rounds : [],
      timeline:
        Array.isArray(game?.timeline) && game.timeline.length > 0
          ? game.timeline
          : Array.isArray(game?.rounds)
            ? game.rounds
            : [],
    } as NormalizedGame;

    return canonicalizeGameAgainstPlayers(normalized, players);
  });
}

function inferTurnsFromGame(game: NormalizedGame, playerId: string): number {
  const totalsTurns = toNumber(
    game?.totals?.[playerId]?.turns ?? game?.totals?.[playerId]?.turnCount
  );
  if (totalsTurns > 0) return totalsTurns;

  const roundTurns = (game.rounds ?? []).filter(
    (round) => String(round?.playerId) === String(playerId)
  ).length;
  return roundTurns;
}

export function buildRadarStatsForPlayer(
  playerId: string,
  games: NormalizedGame[]
): RadarStats {
  const relevant = (games ?? []).filter((game) => game?.totals?.[playerId]);
  if (!relevant.length) {
    return {
      finisher: 0,
      starter: 0,
      supporter: 0,
      receiver: 0,
      stability: 0,
      efficiency: 0,
      risk: 0,
      conversion: 0,
    };
  }

  const scorePerGame: number[] = [];
  const directPerGame: number[] = [];
  const assistInPerGame: number[] = [];
  const objectivePerGame: number[] = [];
  const contractsPerGame: number[] = [];
  const failuresPerGame: number[] = [];
  const efficiencyPerGame: number[] = [];

  for (const game of relevant) {
    const totals = game.totals[playerId];
    const turns = inferTurnsFromGame(game, playerId);
    scorePerGame.push(getMetricValue(totals, "score"));
    directPerGame.push(getMetricValue(totals, "directPrestige"));
    assistInPerGame.push(getMetricValue(totals, "assistPrestigeReceived"));
    objectivePerGame.push(getMetricValue(totals, "objectivePrestige"));
    contractsPerGame.push(getMetricValue(totals, "contracts"));
    failuresPerGame.push(getMetricValue(totals, "failures"));
    efficiencyPerGame.push(turns > 0 ? getMetricValue(totals, "score") / turns : 0);
  }

  const avg = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);

  const max = (values: number[]) => Math.max(1, ...values);

  const avgScore = avg(scorePerGame);
  const avgDirect = avg(directPerGame);
  const avgAssistIn = avg(assistInPerGame);
  const avgObjective = avg(objectivePerGame);
  const avgContracts = avg(contractsPerGame);
  const avgFailures = avg(failuresPerGame);
  const avgEfficiency = avg(efficiencyPerGame);
  const attempts = avgContracts + avgFailures;
  const successRate = attempts > 0 ? avgContracts / attempts : 0;

  return {
    finisher: Math.max(0, Math.min(1, avgScore / max(scorePerGame))),
    starter: Math.max(0, Math.min(1, avgDirect / max(directPerGame))),
    supporter: Math.max(0, Math.min(1, avgAssistIn / max(assistInPerGame))),
    receiver: Math.max(0, Math.min(1, avgObjective / max(objectivePerGame))),
    stability: Math.max(
      0,
      Math.min(1, 1 - avgFailures / Math.max(max(failuresPerGame), 1))
    ),
    efficiency: Math.max(0, Math.min(1, avgEfficiency / max(efficiencyPerGame))),
    risk: Math.max(0, Math.min(1, attempts > 0 ? avgFailures / attempts : 0)),
    conversion: Math.max(0, Math.min(1, successRate)),
  };
}

function getAssistSourceMap(entry?: Record<string, any>): Record<string, number> {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return {};

  const candidates = [
    entry.assistPrestigeByPlayer,
    entry.assistPrestigeFromPlayers,
    entry.assistSources,
    entry.assistPrestigeBySource,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeAssistMap(candidate);
    if (Object.keys(normalized).length > 0) {
      return normalized;
    }
  }

  return {};
}

export function buildRelationships(
  players: StorePlayer[],
  games: NormalizedGame[]
): Relationships {
  const relationships: Relationships = {};

  for (const player of players ?? []) {
    const playerId = String(player?.id ?? "").trim();
    if (playerId) relationships[playerId] = {};
  }

  for (const game of games ?? []) {
    for (const [recipientId, entry] of Object.entries(game?.totals ?? {})) {
      const sourceMap = getAssistSourceMap(entry as Record<string, any>);

      for (const [sourceId, amount] of Object.entries(sourceMap)) {
        if (!sourceId || sourceId === recipientId || toNumber(amount) <= 0) continue;
        if (!relationships[sourceId]) relationships[sourceId] = {};
        relationships[sourceId][recipientId] =
          toNumber(relationships[sourceId][recipientId]) + toNumber(amount);
      }
    }
  }

  return relationships;
}

export function buildUnifiedSnapshots(
  games: NormalizedGame[],
  players: StorePlayer[]
): SnapshotPoint[] {
  return (games ?? []).map((game, index) => {
    const snapshot: Record<string, Record<string, number | string>> = {};

    for (const player of players ?? []) {
      const playerId = String(player?.id ?? "").trim();
      if (!playerId) continue;

      let totals = game?.totals?.[playerId];

      if (!totals) {
        const matchKey = Object.keys(game?.totals ?? {}).find((key) => {
          const entry = game?.totals?.[key];
          return (
            String(key) === String(playerId) ||
            normalizeLooseName(entry?.name) === normalizeLooseName(player?.name) ||
            normalizeLooseName(entry?.playerName) === normalizeLooseName(player?.name)
          );
        });

        if (matchKey) {
          totals = game?.totals?.[matchKey];
        }
      }

      if (!totals) continue;

      const inferredTurns = inferTurnsFromGame(game, playerId);
      const directPrestige = getMetricValue(totals, "directPrestige");
      const assistPrestigeReceived = getMetricValue(totals, "assistPrestigeReceived");
      const objectivePrestige = getMetricValue(totals, "objectivePrestige");
      const score = getMetricValue(totals, "score");
      const totalPrestige = getMetricValue(totals, "totalPrestige");
      const contracts = getMetricValue(totals, "contracts");
      const failures = getMetricValue(totals, "failures");
      const assists = getMetricValue(totals, "assists");

      snapshot[playerId] = {
        playerId,
        playerName: String(
          player?.name ??
          (totals as any)?.playerName ??
          (totals as any)?.name ??
          "Player"
        ),
        label: String(
          player?.name ??
          (totals as any)?.playerName ??
          (totals as any)?.name ??
          "Player"
        ),
        color: String(player?.color ?? ""),
        score,
        totalPrestige,
        prestige: totalPrestige,
        directPrestige,
        assistPrestigeReceived,
        objectivePrestige,
        assists,
        contracts,
        failures,
        turns: inferredTurns,
        efficiency: inferredTurns > 0 ? score / inferredTurns : 0,
        assistEfficiency:
          inferredTurns > 0 ? assistPrestigeReceived / inferredTurns : 0,
        directEfficiency:
          inferredTurns > 0 ? directPrestige / inferredTurns : 0,
        contractSuccessRate:
          contracts + failures > 0 ? (contracts / (contracts + failures)) * 100 : 0,
        netPrestige: directPrestige + assistPrestigeReceived + objectivePrestige,
        supportBalance: assistPrestigeReceived - directPrestige,
      };
    }

    return {
      round: index + 1,
      gameIndex: index + 1,
      label: `Game ${index + 1}`,
      snapshot,
    };
  });
}

export function buildReplaySnapshotsFromGame(
  game?: NormalizedGame | null
): SnapshotPoint[] {
  const replayRounds =
    Array.isArray(game?.rounds) && game.rounds.length > 0
      ? game.rounds
      : Array.isArray(game?.timeline)
        ? game.timeline
        : [];

  if (!replayRounds.length) return [];

  const running: Record<string, Record<string, number | string>> = {};

  return replayRounds.map((round, index) => {
    const playerId = String(round?.playerId ?? "").trim();
    if (!playerId) {
      return {
        round: index + 1,
        gameIndex: index + 1,
        label: `Round ${index + 1}`,
        snapshot: { ...running },
      };
    }

    const player = (game.players ?? []).find(
      (candidate) => String(candidate?.id ?? "").trim() === playerId
    );
    const existing = running[playerId] ?? {
      playerId,
      playerName: String(player?.name ?? "Player"),
      label: String(player?.name ?? "Player"),
      color: String(player?.color ?? ""),
      score: 0,
      totalPrestige: 0,
      prestige: 0,
      directPrestige: 0,
      assistPrestigeReceived: 0,
      objectivePrestige: 0,
      assists: 0,
      contracts: 0,
      failures: 0,
      turns: 0,
    };

    const directPrestige = toNumber(round?.directPrestige ?? round?.prestige);
    const assistPrestigeReceived = toNumber(round?.assistPrestigeReceived);
    const objectivePrestige = toNumber(round?.objectivePrestige);
    const totalPrestige =
      directPrestige + assistPrestigeReceived + objectivePrestige;
    const contracts = toNumber(round?.contracts);
    const failures = toNumber(round?.failures);
    const assists = toNumber(round?.assists);
    const turns = toNumber(existing.turns) + 1;

    running[playerId] = {
      playerId,
      playerName: String(player?.name ?? existing.playerName ?? "Player"),
      label: String(player?.name ?? existing.label ?? "Player"),
      color: String(player?.color ?? existing.color ?? ""),
      score: toNumber(existing.score) + totalPrestige,
      totalPrestige: toNumber(existing.totalPrestige) + totalPrestige,
      prestige: toNumber(existing.prestige) + totalPrestige,
      directPrestige: toNumber(existing.directPrestige) + directPrestige,
      assistPrestigeReceived:
        toNumber(existing.assistPrestigeReceived) + assistPrestigeReceived,
      objectivePrestige:
        toNumber(existing.objectivePrestige) + objectivePrestige,
      assists: toNumber(existing.assists) + assists,
      contracts: toNumber(existing.contracts) + contracts,
      failures: toNumber(existing.failures) + failures,
      turns,
      efficiency: turns > 0 ? (toNumber(existing.score) + totalPrestige) / turns : 0,
      assistEfficiency:
        turns > 0
          ? (toNumber(existing.assistPrestigeReceived) + assistPrestigeReceived) /
            turns
          : 0,
      directEfficiency:
        turns > 0
          ? (toNumber(existing.directPrestige) + directPrestige) / turns
          : 0,
      contractSuccessRate:
        toNumber(existing.contracts) + contracts + toNumber(existing.failures) + failures >
        0
          ? ((toNumber(existing.contracts) + contracts) /
              (toNumber(existing.contracts) +
                contracts +
                toNumber(existing.failures) +
                failures)) *
            100
          : 0,
      netPrestige:
        toNumber(existing.directPrestige) +
        directPrestige +
        toNumber(existing.assistPrestigeReceived) +
        assistPrestigeReceived +
        toNumber(existing.objectivePrestige) +
        objectivePrestige,
      supportBalance:
        toNumber(existing.assistPrestigeReceived) +
        assistPrestigeReceived -
        (toNumber(existing.directPrestige) + directPrestige),
    };

    return {
      round: index + 1,
      gameIndex: index + 1,
      label: `Round ${index + 1}`,
      snapshot: JSON.parse(JSON.stringify(running)),
    };
  });
}

export function buildSparkSeries(
  snapshots: SnapshotPoint[],
  playerId?: string | null,
  metricKey: SimpleMetricKey = "totalPrestige"
): number[] {
  if (!playerId) return [];

  return (snapshots ?? [])
    .map((point) => toNumber(point?.snapshot?.[String(playerId)]?.[metricKey]))
    .filter((value) => Number.isFinite(value));
}

export function normalizeReplayMetric(
  metricKey: SimpleMetricKey
): ReplayMetricKey {
  if (REPLAY_METRICS.includes(metricKey as ReplayMetricKey)) {
    return metricKey as ReplayMetricKey;
  }

  switch (metricKey) {
    case "prestige":
    case "objectivePrestige":
    case "efficiency":
    case "assistEfficiency":
    case "directEfficiency":
    case "contractSuccessRate":
    case "netPrestige":
    case "supportBalance":
      return "totalPrestige";
    default:
      return "score";
  }
}

export function getSupportedMetricKeysForChart(chartKey?: string | null): SimpleMetricKey[] {
  const normalized = normalizeChartKey(chartKey);

  if (REPLAY_CHART_KEYS.has(normalized)) {
    return [
      "totalPrestige",
      "directPrestige",
      "assistPrestigeReceived",
      "assists",
      "contracts",
      "failures",
    ];
  }

  if (STACKED_METRIC_CHART_KEYS.has(normalized)) {
    return ["totalPrestige", "score", "contracts", "assists", "failures"];
  }

  if (FULL_METRIC_CHART_KEYS.has(normalized)) {
    return [...METRIC_OPTIONS];
  }

  return [];
}

export function normalizeMetricForChart(
  chartKey?: string | null,
  metricKey?: string | null
): SimpleMetricKey | null {
  const supported = getSupportedMetricKeysForChart(chartKey);
  if (!supported.length) return null;

  const rawMetric = String(metricKey ?? "").trim();
  if (!rawMetric) return null;

  if (supported.includes(rawMetric as SimpleMetricKey)) {
    return rawMetric as SimpleMetricKey;
  }

  if (rawMetric === "prestige") {
    return supported.includes("totalPrestige") ? "totalPrestige" : supported[0];
  }

  if (REPLAY_CHART_KEYS.has(normalizeChartKey(chartKey))) {
    const replayMetric = normalizeReplayMetric(rawMetric as SimpleMetricKey);
    return replayMetric === "score" ? "totalPrestige" : replayMetric;
  }

  return supported[0];
}

export function buildStackedMetricOptions(): MetricOption[] {
  return [
    { key: "totalPrestige", label: "Total Prestige" },
    { key: "score", label: "Score" },
    { key: "contracts", label: "Contracts" },
    { key: "assists", label: "Assists" },
    { key: "failures", label: "Failures" },
  ];
}

function metricSegmentsForPlayer(
  playerId: string,
  label: string,
  color: string | undefined,
  totals: PlayerTotals
): StackedRow {
  const directPrestige = getMetricValue(totals, "directPrestige");
  const assistPrestigeReceived = getMetricValue(totals, "assistPrestigeReceived");
  const objectivePrestige = getMetricValue(totals, "objectivePrestige");
  const score = getMetricValue(totals, "score");
  const contracts = getMetricValue(totals, "contracts");
  const assists = getMetricValue(totals, "assists");
  const failures = getMetricValue(totals, "failures");

  return {
    id: playerId,
    label,
    color,
    segments: [
      { key: "directPrestige", label: "Direct", value: directPrestige, color: STACKED_COLORS.directPrestige },
      { key: "assistPrestigeReceived", label: "Assist", value: assistPrestigeReceived, color: STACKED_COLORS.assistPrestigeReceived },
      { key: "objectivePrestige", label: "Objective", value: objectivePrestige, color: STACKED_COLORS.objectivePrestige },
      { key: "score", label: "Score", value: score, color: STACKED_COLORS.score },
      { key: "contracts", label: "Contracts", value: contracts, color: STACKED_COLORS.contracts },
      { key: "assists", label: "Assists", value: assists, color: STACKED_COLORS.assists },
      { key: "failures", label: "Failures", value: failures, color: STACKED_COLORS.failures },
    ],
  };
}

export function buildMetricDataMap(
  players: StorePlayer[],
  games: NormalizedGame[]
): Record<string, StackedRow[]> {
  const playerRows: StackedRow[] = (players ?? []).map((player) => {
    let aggregate: PlayerTotals = {};

    for (const game of games ?? []) {
      const totals = game?.totals?.[String(player.id)];
      if (!totals) continue;
      aggregate = mergeTotalsEntry(aggregate, totals);
    }

    return metricSegmentsForPlayer(
      String(player.id),
      String(player.name ?? "Player"),
      player.color,
      aggregate
    );
  });

  return {
    totalPrestige: playerRows.map((row) => ({
      ...row,
      segments: row.segments.filter((segment) =>
        ["directPrestige", "assistPrestigeReceived", "objectivePrestige"].includes(segment.key)
      ),
    })),
    score: playerRows.map((row) => ({
      ...row,
      segments: row.segments.filter((segment) => ["score"].includes(segment.key)),
    })),
    contracts: playerRows.map((row) => ({
      ...row,
      segments: row.segments.filter((segment) =>
        ["contracts", "failures"].includes(segment.key)
      ),
    })),
    assists: playerRows.map((row) => ({
      ...row,
      segments: row.segments.filter((segment) =>
        ["assistPrestigeReceived", "assists"].includes(segment.key)
      ),
    })),
    failures: playerRows.map((row) => ({
      ...row,
      segments: row.segments.filter((segment) => ["failures"].includes(segment.key)),
    })),
  };
}
