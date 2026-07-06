export const ELO_CHART_MODE_OPTIONS = [
  { key: "elo", label: "ELO" },
  { key: "eloDelta", label: "Delta" },
  { key: "matchupGap", label: "Gap" },
] as const;

export const DEFAULT_ELO_MODE = "elo" as const;

export type EloChartMode = "elo" | "eloDelta" | "matchupGap";

export type EloChartPlayer = {
  id: string;
  name?: string;
  color?: string | null;
};

export type EloSnapshotValue =
  | number
  | {
      elo?: number;
    }
  | null
  | undefined;

export type EloChartGame = {
  id?: string | null;
  gameId?: string | null;
  createdAt?: number | null;
  players?: Array<{
    id?: string | null;
    playerId?: string | null;
  }>;
  totals?: Record<string, unknown> | null;
  eloSnapshot?: Record<string, EloSnapshotValue>;
  winnerId?: string | null;
  selectedWinnerId?: string | null;
  manualWinnerId?: string | null;
};

export type EloChartSeries = {
  id: string;
  name: string;
  colorValue: string;
  values: number[];
  isFocused: boolean;
};

export type EloChartState = {
  games: EloChartGame[];
  players: EloChartPlayer[];
  eloSeriesPaths: EloChartSeries[];
  seriesPaths: EloChartSeries[];
  focusedPlayerId: string | null;
  focusedSeries: EloChartSeries | null;
  focusedMetricValues: {
    eloValues: number[];
    eloDelta: number[];
    matchupGap: number[];
  };
  modeRanges: Record<EloChartMode, { minValue: number; maxValue: number }>;
  selectedIndex: number;
  selectedMode: EloChartMode;
  minValue: number;
  maxValue: number;
};

const FALLBACK_COLORS = [
  "#A855F7",
  "#3B82F6",
  "#22C55E",
  "#F97316",
  "#14B8A6",
  "#EF4444",
];
const DEFAULT_ELO = 1000;
const DEFAULT_K = 32;

function normalizeId(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeName(value: unknown, fallback: string): string {
  const safe = String(value ?? "").trim();
  return safe || fallback;
}

function getEloValue(value: EloSnapshotValue): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    typeof value.elo === "number" &&
    Number.isFinite(value.elo)
  ) {
    return value.elo;
  }

  return 0;
}

function getColorValue(color: unknown, index: number): string {
  const safe = String(color ?? "").trim();
  if (safe) return safe;
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function average(values: number[]) {
  const safeValues = values.filter((value) => Number.isFinite(value));
  if (!safeValues.length) return 0;
  return safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length;
}

function buildRange(values: number[]) {
  const safeValues = values.filter((value) => Number.isFinite(value));
  if (!safeValues.length) {
    return { minValue: 0, maxValue: 1 };
  }

  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);

  if (min === max) {
    const padding = Math.max(1, Math.abs(min) * 0.05 || 1);
    return {
      minValue: min - padding,
      maxValue: max + padding,
    };
  }

  const padding = Math.max(1, (max - min) * 0.1);
  return {
    minValue: min - padding,
    maxValue: max + padding,
  };
}

function normalizePlayers(players?: EloChartPlayer[]): EloChartPlayer[] {
  const safePlayers = Array.isArray(players) ? players : [];
  const seen = new Set<string>();

  return safePlayers
    .map((player, index) => {
      const id = normalizeId(player?.id);
      if (!id || seen.has(id)) return null;
      seen.add(id);

      return {
        id,
        name: normalizeName(player?.name, `Player ${index + 1}`),
        color: player?.color ?? null,
      };
    })
    .filter(Boolean) as EloChartPlayer[];
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Number(value) || 0;
}

function getTotalsWinnerCandidates(
  totals?: Record<string, unknown> | null
): Array<{ id: string; totalPrestige: number; score: number }> {
  return Object.entries(totals ?? {})
    .map(([rawPlayerId, rawTotals]) => {
      const id = normalizeId(rawPlayerId);
      const entry =
        rawTotals && typeof rawTotals === "object" && !Array.isArray(rawTotals)
          ? (rawTotals as Record<string, unknown>)
          : {};
      const totalPrestige =
        toNumber(entry.totalPrestige) ||
        toNumber(entry.prestige) ||
        toNumber(entry.directPrestige) +
          toNumber(entry.assistPrestigeReceived) +
          toNumber(entry.objectivePrestige ?? entry.objectiveCount);

      return {
        id,
        totalPrestige,
        score: toNumber(entry.score),
      };
    })
    .filter((row) => row.id);
}

function getWinnerId(game?: EloChartGame | null): string | null {
  const explicit =
    normalizeId(
      game?.winnerId ?? game?.selectedWinnerId ?? game?.manualWinnerId
    ) || null;
  if (explicit) return explicit;

  const ranked = getTotalsWinnerCandidates(game?.totals).sort((left, right) => {
    if (right.totalPrestige !== left.totalPrestige) {
      return right.totalPrestige - left.totalPrestige;
    }
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.id.localeCompare(right.id);
  });

  return ranked[0]?.id ?? null;
}

function getGameParticipantIds(game: EloChartGame, playerIds: string[]): string[] {
  const ids = new Set<string>();

  for (const player of Array.isArray(game?.players) ? game.players : []) {
    const id = normalizeId(player?.id ?? player?.playerId);
    if (id && playerIds.includes(id)) ids.add(id);
  }

  for (const id of Object.keys(game?.totals ?? {})) {
    const normalized = normalizeId(id);
    if (normalized && playerIds.includes(normalized)) ids.add(normalized);
  }

  return [...ids];
}

function expectedScore(playerRating: number, opponentRatings: number[]) {
  const safeOpponents = opponentRatings.filter((value) => Number.isFinite(value));
  if (!safeOpponents.length) return 0.5;

  const totalExpected = safeOpponents.reduce((sum, opponentRating) => {
    return sum + 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  }, 0);

  return totalExpected / safeOpponents.length;
}

function updateRating(
  currentRating: number,
  opponentRatings: number[],
  actualScore: number
) {
  const expected = expectedScore(currentRating, opponentRatings);
  return Math.round(currentRating + DEFAULT_K * (actualScore - expected));
}

function buildDerivedGames(
  games: EloChartGame[],
  players: EloChartPlayer[]
): EloChartGame[] {
  const playerIds = players.map((player) => player.id);
  const ratings = Object.fromEntries(
    playerIds.map((playerId) => [playerId, DEFAULT_ELO])
  ) as Record<string, number>;

  return games.map((game) => {
    const participantIds = getGameParticipantIds(game, playerIds);
    const winnerId = getWinnerId(game);
    const explicitSnapshotEntries: Array<[string, number]> = playerIds
      .map((playerId) => [
        playerId,
        getEloValue(game?.eloSnapshot?.[playerId]),
      ] as [string, number])
      .filter((entry) => entry[1] > 0);
    const explicitSnapshot = Object.fromEntries(
      explicitSnapshotEntries
    ) as Record<string, number>;

    if (Object.keys(explicitSnapshot).length > 0) {
      Object.assign(ratings, explicitSnapshot);

      return {
        ...game,
        eloSnapshot: Object.fromEntries(
          playerIds.map((playerId) => [playerId, ratings[playerId] ?? DEFAULT_ELO])
        ),
      };
    }

    if (participantIds.length >= 2) {
      const nextRatings = { ...ratings };

      for (const playerId of participantIds) {
        const opponentRatings = participantIds
          .filter((id) => id !== playerId)
          .map((id) => ratings[id] ?? DEFAULT_ELO);

        const actualScore = winnerId ? (winnerId === playerId ? 1 : 0) : 0.5;

        nextRatings[playerId] = updateRating(
          ratings[playerId] ?? DEFAULT_ELO,
          opponentRatings,
          actualScore
        );
      }

      Object.assign(ratings, nextRatings);
    }

    return {
      ...game,
      eloSnapshot: Object.fromEntries(
        playerIds.map((playerId) => [playerId, ratings[playerId] ?? DEFAULT_ELO])
      ),
    };
  });
}

function normalizeGames(games?: EloChartGame[]): EloChartGame[] {
  return [...(Array.isArray(games) ? games : [])].sort((left, right) => {
    const createdDiff = toNumber(left?.createdAt) - toNumber(right?.createdAt);
    if (createdDiff !== 0) return createdDiff;

    const leftId = normalizeId(left?.id ?? left?.gameId);
    const rightId = normalizeId(right?.id ?? right?.gameId);
    return leftId.localeCompare(rightId);
  });
}

function filterGamesForFocusedPlayer(
  games: EloChartGame[] | undefined,
  focusedPlayerId: string | null,
  playerIds: string[]
) {
  if (!focusedPlayerId) {
    return Array.isArray(games) ? games : [];
  }

  return (Array.isArray(games) ? games : []).filter((game) =>
    getGameParticipantIds(game, playerIds).includes(focusedPlayerId)
  );
}

function buildFocusedMetricValues(args: {
  games: EloChartGame[];
  focusedPlayerId: string | null;
  eloSeriesPaths: EloChartSeries[];
  playerIds: string[];
}) {
  const focusedSeries =
    args.eloSeriesPaths.find((row) => row.id === args.focusedPlayerId) ?? null;
  const eloValues = focusedSeries?.values ?? [];

  const eloDelta = eloValues.map((value, index) =>
    index === 0 ? 0 : value - (eloValues[index - 1] ?? 0)
  );

  const matchupGap = args.games.map((game, index) => {
    if (!args.focusedPlayerId) {
      return 0;
    }

    const participantIds = getGameParticipantIds(game, args.playerIds).filter(
      (playerId) => playerId !== args.focusedPlayerId
    );
    if (!participantIds.length) {
      return 0;
    }

    const opponentElos = participantIds.map((playerId) =>
      getEloValue(game?.eloSnapshot?.[playerId])
    );
    const safeOpponentElos = opponentElos.filter((value) => Number.isFinite(value));
    if (!safeOpponentElos.length) {
      return 0;
    }

    const focusedElo =
      eloValues[index] ?? getEloValue(game?.eloSnapshot?.[args.focusedPlayerId]);

    return focusedElo - average(safeOpponentElos);
  });

  return {
    focusedSeries,
    focusedMetricValues: {
      eloValues,
      eloDelta,
      matchupGap,
    },
  };
}

type EloChartStateWithLegacyAliases = EloChartState & {
  selectedMode: typeof DEFAULT_ELO_MODE;
};

export function buildEloChartState(args: {
  games?: EloChartGame[];
  players?: EloChartPlayer[];
  primaryPlayerId?: string | null;
}): EloChartStateWithLegacyAliases {
  const players = normalizePlayers(args.players);
  const requestedFocusId = normalizeId(args.primaryPlayerId);
  const focusedPlayerId =
    (requestedFocusId && players.some((player) => player.id === requestedFocusId)
      ? requestedFocusId
      : players[0]?.id) ?? null;
  const playerIds = players.map((player) => player.id);
  const games = buildDerivedGames(
    normalizeGames(filterGamesForFocusedPlayer(args.games, focusedPlayerId, playerIds)),
    players
  );

  const eloSeriesPaths = players.map((player, index) => ({
    id: player.id,
    name: normalizeName(player.name, `Player ${index + 1}`),
    colorValue: getColorValue(player.color, index),
    values: games.map((game) => getEloValue(game?.eloSnapshot?.[player.id])),
    isFocused: player.id === focusedPlayerId,
  }));

  const { focusedSeries, focusedMetricValues } = buildFocusedMetricValues({
    games,
    focusedPlayerId,
    eloSeriesPaths,
    playerIds,
  });

  const modeRanges = {
    elo: buildRange(eloSeriesPaths.flatMap((row) => row.values)),
    eloDelta: buildRange(focusedMetricValues.eloDelta),
    matchupGap: buildRange(focusedMetricValues.matchupGap),
  };
  const { minValue, maxValue } = modeRanges.elo;

  return {
    games,
    players,
    eloSeriesPaths,
    seriesPaths: eloSeriesPaths,
    focusedPlayerId,
    focusedSeries,
    focusedMetricValues,
    modeRanges,
    selectedIndex: games.length > 0 ? games.length - 1 : 0,
    selectedMode: DEFAULT_ELO_MODE,
    minValue,
    maxValue,
  };
}
