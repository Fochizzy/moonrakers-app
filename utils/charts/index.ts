import { PLAYER_METRICS, getMetricOrFallback } from "@/utils/metricMap";

export type StorePlayer = {
  id: string;
  name?: string;
  color?: string;
  initials?: string;
  assignedCardArtIndex?: number | null;
  artIndex?: number | null;
};

export type FlexibleStore = Record<string, any>;

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

export type SnapshotPoint = {
  round: number;
  gameIndex: number;
  label: string;
  snapshot: Record<string, Record<string, number>>;
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

export type MetricOption = {
  key: string;
  label: string;
  shortLabel?: string;
  category?: string;
  description?: string;
};

export type PlayerAggregate = {
  games: number;
  wins: number;
  score: number;
  totalPrestige: number;
  prestige: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  assistPrestigeSent: number;
  objectivePrestige: number;
  assists: number;
  contracts: number;
  failures: number;
  turns: number;
  eloCurrent: number;
  eloStart: number;
  bestPrestigeMargin: number;
  prestigeMarginTotal: number;
  closeGames: number;
  startSeatTotal: number;
  startSeatCount: number;
};

export type RadarStats = {
  finisher?: number;
  starter?: number;
  supporter?: number;
  receiver?: number;
  stability?: number;
  efficiency?: number;
  risk?: number;
  conversion?: number;
};

export type Relationships = Record<string, Record<string, number>>;

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

export const CHART_COLORS = {
  blue: "#3B82F6",
  green: "#22C55E",
  amber: "#F59E0B",
  accent: "#A855F7",
};

export function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Number(value) || 0;
}

export function safeDivide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

export function normalizeStoreGames(store: FlexibleStore): any[] {
  if (!Array.isArray(store?.games)) return [];

  return store.games
    .filter(Boolean)
    .map((game: any, index: number) => ({
      ...game,
      id: game?.id ?? `game-${index + 1}`,
      players: Array.isArray(game?.players) ? game.players : [],
      totals: game?.totals ?? {},
      rounds: Array.isArray(game?.rounds) ? game.rounds : [],
      timeline: Array.isArray(game?.timeline) ? game.timeline : [],
    }));
}

export function collectUnifiedGames(store: FlexibleStore): any[] {
  return normalizeStoreGames(store);
}

export function getPlayerById(players: StorePlayer[], id?: string | null) {
  if (!id) return null;
  return players.find((player) => String(player.id) === String(id)) ?? null;
}

export function normalizeLooseName(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ");
}

export function getGameMetricValue(
  totals: any,
  metricKey: SimpleMetricKey
): number {
  const directPrestige =
    toNumber(totals?.directPrestige) ||
    toNumber(totals?.selfPrestige) ||
    toNumber(totals?.prestigeFromSelf);

  const assistPrestigeReceived =
    toNumber(totals?.assistPrestigeReceived) ||
    toNumber(totals?.assistsReceived) ||
    toNumber(totals?.assistIn);

  const objectivePrestige =
    toNumber(totals?.objectivePrestige) ||
    toNumber(totals?.objectiveCount);

  const contracts =
    toNumber(totals?.contracts) ||
    toNumber(totals?.successes) ||
    toNumber(totals?.contractSuccesses) ||
    toNumber(totals?.successfulContracts);

  const failures =
    toNumber(totals?.failures) ||
    toNumber(totals?.contractFailures) ||
    toNumber(totals?.failedContracts);

  const assists =
    toNumber(totals?.assists) ||
    toNumber(totals?.assistsGiven) ||
    toNumber(totals?.assistGiven);

  const turns =
    toNumber(totals?.turns) || toNumber(totals?.turnCount) || 0;

  const totalPrestige =
    toNumber(totals?.totalPrestige) ||
    toNumber(totals?.prestige) ||
    directPrestige + assistPrestigeReceived + objectivePrestige;

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
      return turns > 0 ? assistPrestigeReceived / turns : 0;
    case "directEfficiency":
      return turns > 0 ? directPrestige / turns : 0;
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

export function mergeAssistMap(
  base: Record<string, number>,
  incoming: any,
  idMap: Record<string, string>
) {
  const out = { ...base };
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return out;
  }

  for (const [rawKey, rawValue] of Object.entries(incoming)) {
    const mappedKey = idMap[String(rawKey)] ?? String(rawKey);
    out[mappedKey] = toNumber(out[mappedKey]) + toNumber(rawValue);
  }

  return out;
}

export function mergeTotalsEntry(
  existing: any,
  incoming: any,
  idMap: Record<string, string>
) {
  const a = existing && typeof existing === "object" ? existing : {};
  const b = incoming && typeof incoming === "object" ? incoming : {};

  const objectiveA = toNumber(a.objectivePrestige ?? a.objectiveCount);
  const objectiveB = toNumber(b.objectivePrestige ?? b.objectiveCount);

  return {
    ...a,
    ...b,
    score: toNumber(a.score) + toNumber(b.score),
    totalPrestige:
      toNumber(a.totalPrestige ?? a.prestige) +
      toNumber(b.totalPrestige ?? b.prestige),
    prestige:
      toNumber(a.prestige ?? a.totalPrestige) +
      toNumber(b.prestige ?? b.totalPrestige),
    directPrestige: toNumber(a.directPrestige) + toNumber(b.directPrestige),
    assistPrestigeReceived:
      toNumber(a.assistPrestigeReceived) + toNumber(b.assistPrestigeReceived),
    assistPrestigeSent:
      toNumber(a.assistPrestigeSent) + toNumber(b.assistPrestigeSent),
    objectivePrestige: objectiveA + objectiveB,
    objectiveCount: objectiveA + objectiveB,
    assists: toNumber(a.assists) + toNumber(b.assists),
    contracts: toNumber(a.contracts) + toNumber(b.contracts),
    failures: toNumber(a.failures) + toNumber(b.failures),
    turns:
      toNumber(a.turns ?? a.turnCount) + toNumber(b.turns ?? b.turnCount),
    turnCount:
      toNumber(a.turnCount ?? a.turns) + toNumber(b.turnCount ?? b.turns),
    assistPrestigeBySource: mergeAssistMap(
      a.assistPrestigeBySource ?? {},
      b.assistPrestigeBySource,
      idMap
    ),
    assistPrestigeByPlayer: mergeAssistMap(
      a.assistPrestigeByPlayer ?? {},
      b.assistPrestigeByPlayer,
      idMap
    ),
    assistPrestigeFromPlayers: mergeAssistMap(
      a.assistPrestigeFromPlayers ?? {},
      b.assistPrestigeFromPlayers,
      idMap
    ),
    assistSources: mergeAssistMap(a.assistSources ?? {}, b.assistSources, idMap),
  };
}

export function findCanonicalPlayerMatch(
  gamePlayer: any,
  resolvedPlayers: StorePlayer[]
) {
  const gameId = String(gamePlayer?.id ?? gamePlayer?.playerId ?? "").trim();
  const gameName = normalizeLooseName(gamePlayer?.name ?? gamePlayer?.playerName);

  let canonical =
    resolvedPlayers.find((player) => String(player.id) === gameId) ?? null;

  if (!canonical && gameName) {
    canonical =
      resolvedPlayers.find(
        (player) => normalizeLooseName(player.name) === gameName
      ) ?? null;
  }

  return canonical;
}

export function canonicalizeGames(games: any[], resolvedPlayers: StorePlayer[]) {
  return games.map((game) => {
    const rawPlayers = Array.isArray(game?.players) ? game.players : [];
    const totals =
      game?.totals && typeof game.totals === "object" ? game.totals : {};
    const idMap: Record<string, string> = {};

    for (const rawPlayer of rawPlayers) {
      const canonical = findCanonicalPlayerMatch(rawPlayer, resolvedPlayers);
      const rawId = String(rawPlayer?.id ?? rawPlayer?.playerId ?? "").trim();
      if (rawId && canonical?.id) {
        idMap[rawId] = String(canonical.id);
      }
    }

    for (const rawId of Object.keys(totals)) {
      if (idMap[rawId]) continue;

      const canonicalById =
        resolvedPlayers.find((player) => String(player.id) === String(rawId)) ??
        null;

      if (canonicalById) {
        idMap[rawId] = String(canonicalById.id);
        continue;
      }

      const entry = totals[rawId];
      const entryName = normalizeLooseName(entry?.name ?? entry?.playerName);

      if (entryName) {
        const canonicalByName =
          resolvedPlayers.find(
            (player) => normalizeLooseName(player.name) === entryName
          ) ?? null;

        if (canonicalByName) {
          idMap[rawId] = String(canonicalByName.id);
        }
      }
    }

    const canonicalPlayers = rawPlayers.map((rawPlayer: any) => {
      const canonical = findCanonicalPlayerMatch(rawPlayer, resolvedPlayers);

      if (!canonical) {
        return {
          ...rawPlayer,
          id: String(rawPlayer?.id ?? rawPlayer?.playerId ?? ""),
          name: rawPlayer?.name ?? rawPlayer?.playerName ?? "Unknown",
        };
      }

      return {
        ...rawPlayer,
        ...canonical,
        id: String(canonical.id),
        name:
          canonical.name ?? rawPlayer?.name ?? rawPlayer?.playerName ?? "Unknown",
        color: canonical.color ?? rawPlayer?.color,
      };
    });

    const canonicalTotals: Record<string, any> = {};
    for (const [rawId, rawEntry] of Object.entries(totals)) {
      const canonicalId = idMap[String(rawId)] ?? String(rawId);
      canonicalTotals[canonicalId] = mergeTotalsEntry(
        canonicalTotals[canonicalId],
        rawEntry,
        idMap
      );
    }

    const canonicalWinnerId =
      idMap[String(game?.winnerId ?? "")] ||
      idMap[String(game?.selectedWinnerId ?? "")] ||
      idMap[String(game?.manualWinnerId ?? "")] ||
      game?.winnerId ||
      game?.selectedWinnerId ||
      game?.manualWinnerId;

    const rounds = Array.isArray(game?.rounds)
      ? game.rounds.map((round: any) => ({
          ...round,
          playerId:
            idMap[String(round?.playerId ?? "").trim()] ??
            String(round?.playerId ?? "").trim(),
          assistRecipients:
            round?.assistRecipients && typeof round.assistRecipients === "object"
              ? Object.fromEntries(
                  Object.entries(round.assistRecipients).map(([targetId, value]) => [
                    idMap[String(targetId)] ?? String(targetId),
                    toNumber(value),
                  ])
                )
              : {},
          assistPrestigeRecipients:
            round?.assistPrestigeRecipients &&
            typeof round.assistPrestigeRecipients === "object"
              ? Object.fromEntries(
                  Object.entries(round.assistPrestigeRecipients).map(
                    ([targetId, value]) => [
                      idMap[String(targetId)] ?? String(targetId),
                      toNumber(value),
                    ]
                  )
                )
              : {},
        }))
      : [];

    return {
      ...game,
      players: canonicalPlayers,
      totals: canonicalTotals,
      rounds,
      winnerId: canonicalWinnerId ?? game?.winnerId,
      selectedWinnerId: canonicalWinnerId ?? game?.selectedWinnerId,
      manualWinnerId: canonicalWinnerId ?? game?.manualWinnerId,
    };
  });
}

export function buildRadarStatsForPlayer(
  playerId: string,
  games: any[]
): RadarStats {
  const aggregate = games.reduce(
    (acc, game) => {
      const totals = game?.totals?.[playerId];
      if (!totals) {
        return acc;
      }

      const score = getGameMetricValue(totals, "score");
      const totalPrestige = getGameMetricValue(totals, "totalPrestige");
      const directPrestige = getGameMetricValue(totals, "directPrestige");
      const assistPrestigeReceived = getGameMetricValue(
        totals,
        "assistPrestigeReceived"
      );
      const objectivePrestige = getGameMetricValue(totals, "objectivePrestige");
      const assists = getGameMetricValue(totals, "assists");
      const contracts = getGameMetricValue(totals, "contracts");
      const failures = getGameMetricValue(totals, "failures");
      const turns =
        getGameMetricValue(totals, "turns") ||
        (Array.isArray(game?.rounds)
          ? game.rounds.filter((round: any) => String(round?.playerId) === String(playerId))
              .length
          : 0);

      acc.games += 1;
      acc.score += score;
      acc.totalPrestige += totalPrestige;
      acc.directPrestige += directPrestige;
      acc.assistPrestigeReceived += assistPrestigeReceived;
      acc.objectivePrestige += objectivePrestige;
      acc.assists += assists;
      acc.contracts += contracts;
      acc.failures += failures;
      acc.turns += turns;

      acc.scorePerGame.push(score);
      acc.directPerGame.push(directPrestige);
      acc.assistInPerGame.push(assistPrestigeReceived);
      acc.objectivePerGame.push(objectivePrestige);
      acc.contractsPerGame.push(contracts);
      acc.failuresPerGame.push(failures);
      acc.efficiencyPerGame.push(turns > 0 ? totalPrestige / turns : 0);

      return acc;
    },
    {
      games: 0,
      score: 0,
      totalPrestige: 0,
      directPrestige: 0,
      assistPrestigeReceived: 0,
      objectivePrestige: 0,
      assists: 0,
      contracts: 0,
      failures: 0,
      turns: 0,
      scorePerGame: [] as number[],
      directPerGame: [] as number[],
      assistInPerGame: [] as number[],
      objectivePerGame: [] as number[],
      contractsPerGame: [] as number[],
      failuresPerGame: [] as number[],
      efficiencyPerGame: [] as number[],
    }
  );

  const attempts = aggregate.contracts + aggregate.failures;
  const gamesCount = Math.max(1, aggregate.games);

  const avgScorePerGame = aggregate.score / gamesCount;
  const avgDirectPerGame = aggregate.directPrestige / gamesCount;
  const avgAssistInPerGame = aggregate.assistPrestigeReceived / gamesCount;
  const avgObjectivePerGame = aggregate.objectivePrestige / gamesCount;
  const avgContractsPerGame = aggregate.contracts / gamesCount;
  const avgFailuresPerGame = aggregate.failures / gamesCount;
  const successRate = attempts > 0 ? aggregate.contracts / attempts : 0;
  const efficiency =
    aggregate.turns > 0 ? aggregate.totalPrestige / aggregate.turns : 0;

  const maxAvg = (values: number[]) => {
    const max = Math.max(...values, 0);
    return max > 0 ? max : 1;
  };

  return {
    finisher: Math.max(0, Math.min(1, avgScorePerGame / maxAvg(aggregate.scorePerGame))),
    starter: Math.max(0, Math.min(1, avgDirectPerGame / maxAvg(aggregate.directPerGame))),
    supporter: Math.max(0, Math.min(1, avgAssistInPerGame / maxAvg(aggregate.assistInPerGame))),
    receiver: Math.max(0, Math.min(1, avgObjectivePerGame / maxAvg(aggregate.objectivePerGame))),
    stability: Math.max(
      0,
      Math.min(
        1,
        aggregate.games > 1
          ? 1 - avgFailuresPerGame / Math.max(maxAvg(aggregate.failuresPerGame), 1)
          : successRate
      )
    ),
    efficiency: Math.max(
      0,
      Math.min(1, efficiency / Math.max(maxAvg(aggregate.efficiencyPerGame), 1))
    ),
    risk: Math.max(
      0,
      Math.min(
        1,
        avgFailuresPerGame / Math.max(avgContractsPerGame + avgFailuresPerGame, 1)
      )
    ),
    conversion: Math.max(0, Math.min(1, successRate)),
  };
}

export function buildRelationships(
  players: StorePlayer[],
  games: any[]
): Relationships {
  const relationships: Relationships = {};

  for (const player of players) {
    relationships[String(player.id)] = {};
  }

  for (const game of games) {
    const totals = game?.totals;
    if (!totals || typeof totals !== "object" || Array.isArray(totals)) continue;

    for (const [recipientIdRaw, rawEntry] of Object.entries(totals)) {
      const recipientId = String(recipientIdRaw ?? "").trim();
      if (!recipientId) continue;

      const entry =
        rawEntry && typeof rawEntry === "object" && !Array.isArray(rawEntry)
          ? (rawEntry as Record<string, any>)
          : undefined;

      if (!entry) continue;

      const sourceMap =
        entry.assistPrestigeByPlayer ||
        entry.assistPrestigeFromPlayers ||
        entry.assistSources ||
        entry.assistPrestigeBySource ||
        {};

      if (!sourceMap || typeof sourceMap !== "object" || Array.isArray(sourceMap)) {
        continue;
      }

      if (!relationships[recipientId]) {
        relationships[recipientId] = {};
      }

      for (const [sourceIdRaw, amountRaw] of Object.entries(sourceMap)) {
        const sourceId = String(sourceIdRaw ?? "").trim();
        const amount = toNumber(amountRaw);
        if (!sourceId || !recipientId || !amount) continue;

        if (!relationships[sourceId]) relationships[sourceId] = {};
        if (!relationships[recipientId]) relationships[recipientId] = {};

        relationships[sourceId][recipientId] =
          toNumber(relationships[sourceId][recipientId]) + amount;
      }
    }
  }

  return relationships;
}

export function buildRelationshipData(
  players: StorePlayer[],
  games: any[]
): Relationships {
  return buildRelationships(players, games);
}

function inferTurnsFromRounds(game: any, playerId: string) {
  if (!Array.isArray(game?.rounds)) return 0;
  return game.rounds.filter(
    (round: any) => String(round?.playerId) === String(playerId)
  ).length;
}

export function buildUnifiedSnapshots(
  games: any[],
  players: StorePlayer[]
): SnapshotPoint[] {
  return games.map((game, index) => {
    const totalsMap = game?.totals ?? {};
    const snapshot: Record<string, Record<string, number>> = {};

    for (const player of players) {
      const playerTotals = totalsMap?.[player.id] ?? {};
      const inferredTurns =
        toNumber(playerTotals?.turns ?? playerTotals?.turnCount) ||
        inferTurnsFromRounds(game, player.id);

      snapshot[player.id] = {
        score: getGameMetricValue(playerTotals, "score"),
        totalPrestige: getGameMetricValue(playerTotals, "totalPrestige"),
        prestige: getGameMetricValue(playerTotals, "prestige"),
        directPrestige: getGameMetricValue(playerTotals, "directPrestige"),
        assistPrestigeReceived: getGameMetricValue(
          playerTotals,
          "assistPrestigeReceived"
        ),
        objectivePrestige: getGameMetricValue(playerTotals, "objectivePrestige"),
        assists: getGameMetricValue(playerTotals, "assists"),
        contracts: getGameMetricValue(playerTotals, "contracts"),
        failures: getGameMetricValue(playerTotals, "failures"),
        turns: inferredTurns,
        efficiency:
          toNumber(playerTotals?.efficiency) ||
          (inferredTurns > 0
            ? getGameMetricValue(playerTotals, "score") / inferredTurns
            : 0),
        assistEfficiency:
          inferredTurns > 0
            ? getGameMetricValue(playerTotals, "assistPrestigeReceived") /
              inferredTurns
            : 0,
        directEfficiency:
          inferredTurns > 0
            ? getGameMetricValue(playerTotals, "directPrestige") / inferredTurns
            : 0,
        contractSuccessRate: getGameMetricValue(
          playerTotals,
          "contractSuccessRate"
        ),
        netPrestige: getGameMetricValue(playerTotals, "netPrestige"),
        supportBalance: getGameMetricValue(playerTotals, "supportBalance"),
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

export function buildSparkSeries(
  snapshots: SnapshotPoint[],
  playerId: string | null | undefined,
  metric: SimpleMetricKey
) {
  if (!playerId) return [];
  return snapshots.map((point, index) => ({
    value: toNumber(point.snapshot?.[playerId]?.[metric]),
    label: point.label ?? `Game ${index + 1}`,
  }));
}

export function getAssistPrestigeSentFromGame(game: any, playerId: string) {
  const totals = game?.totals ?? {};
  let sent = 0;

  for (const [otherId, otherTotals] of Object.entries(totals)) {
    if (String(otherId) === String(playerId)) continue;

    const entry = otherTotals as any;
    const fromPlayerMap =
      entry?.assistPrestigeByPlayer ||
      entry?.assistPrestigeFromPlayers ||
      entry?.assistPrestigeBySource ||
      entry?.assistSources ||
      null;

    if (fromPlayerMap && typeof fromPlayerMap === "object") {
      sent += toNumber(fromPlayerMap[playerId]);
    }
  }

  sent +=
    toNumber((totals?.[playerId] as any)?.assistPrestigeSent) ||
    toNumber((totals?.[playerId] as any)?.assistsSent);

  return sent;
}

export function buildPlayerAggregate(
  player: StorePlayer,
  games: any[]
): PlayerAggregate {
  const initial: PlayerAggregate = {
    games: 0,
    wins: 0,
    score: 0,
    totalPrestige: 0,
    prestige: 0,
    directPrestige: 0,
    assistPrestigeReceived: 0,
    assistPrestigeSent: 0,
    objectivePrestige: 0,
    assists: 0,
    contracts: 0,
    failures: 0,
    turns: 0,
    eloCurrent: 1200,
    eloStart: 1200,
    bestPrestigeMargin: 0,
    prestigeMarginTotal: 0,
    closeGames: 0,
    startSeatTotal: 0,
    startSeatCount: 0,
  };

  let firstEloCaptured = false;

  for (const game of games) {
    const gamePlayers = Array.isArray(game?.players) ? game.players : [];
    const isInGame = gamePlayers.some(
      (p: any) => String(p?.id) === String(player.id)
    );
    if (!isInGame) continue;

    const totals = game?.totals?.[player.id] ?? {};
    initial.games += 1;

    const score = getGameMetricValue(totals, "score");
    const totalPrestige = getGameMetricValue(totals, "totalPrestige");
    const prestige = getGameMetricValue(totals, "prestige");
    const directPrestige = getGameMetricValue(totals, "directPrestige");
    const assistPrestigeReceived = getGameMetricValue(
      totals,
      "assistPrestigeReceived"
    );
    const objectivePrestige = getGameMetricValue(totals, "objectivePrestige");
    const assists = getGameMetricValue(totals, "assists");
    const contracts = getGameMetricValue(totals, "contracts");
    const failures = getGameMetricValue(totals, "failures");
    const turns =
      getGameMetricValue(totals, "turns") || inferTurnsFromRounds(game, player.id);

    initial.score += score;
    initial.totalPrestige += totalPrestige;
    initial.prestige += prestige;
    initial.directPrestige += directPrestige;
    initial.assistPrestigeReceived += assistPrestigeReceived;
    initial.assistPrestigeSent += getAssistPrestigeSentFromGame(
      game,
      String(player.id)
    );
    initial.objectivePrestige += objectivePrestige;
    initial.assists += assists;
    initial.contracts += contracts;
    initial.failures += failures;
    initial.turns += turns;

    const rawElo = toNumber(totals?.elo) || toNumber(totals?.rating) || 1200;
    const eloDelta = toNumber(totals?.eloDelta);

    if (!firstEloCaptured) {
      initial.eloStart = rawElo - eloDelta;
      firstEloCaptured = true;
    }
    initial.eloCurrent = rawElo;

    const winnerId =
      game?.winnerId ??
      game?.selectedWinnerId ??
      game?.manualWinnerId ??
      null;

    if (String(winnerId) === String(player.id)) {
      initial.wins += 1;
    }

    const otherScores = gamePlayers
      .filter((p: any) => String(p?.id) !== String(player.id))
      .map((p: any) => {
        const otherTotals = game?.totals?.[p.id] ?? {};
        return getGameMetricValue(otherTotals, "totalPrestige");
      });

    const bestOpponent = otherScores.length ? Math.max(...otherScores) : 0;
    const prestigeMargin = totalPrestige - bestOpponent;

    initial.bestPrestigeMargin = Math.max(
      initial.bestPrestigeMargin,
      prestigeMargin
    );
    initial.prestigeMarginTotal += prestigeMargin;

    if (Math.abs(prestigeMargin) <= 3) {
      initial.closeGames += 1;
    }

    const seat =
      toNumber((totals as any)?.startSeat) ||
      toNumber((totals as any)?.seat) ||
      toNumber((totals as any)?.turnOrder) ||
      toNumber(
        gamePlayers.find((p: any) => String(p?.id) === String(player.id))?.startOrder
      ) + 1;

    if (seat > 0) {
      initial.startSeatTotal += seat;
      initial.startSeatCount += 1;
    }
  }

  return initial;
}

export function getAggregateMetricValue(
  metricKey: string,
  aggregate: PlayerAggregate
): number {
  const games = aggregate.games;
  const wins = aggregate.wins;
  const totalPrestige = aggregate.totalPrestige;
  const directPrestige = aggregate.directPrestige;
  const assistPrestigeReceived = aggregate.assistPrestigeReceived;
  const assists = aggregate.assists;
  const contracts = aggregate.contracts;
  const failures = aggregate.failures;

  const winRate = safeDivide(wins, games);
  const failureRate = safeDivide(failures, contracts + failures);
  const avgPrestigeMarginPerGame = safeDivide(
    aggregate.prestigeMarginTotal,
    games
  );
  const avgStartSeat = safeDivide(
    aggregate.startSeatTotal,
    aggregate.startSeatCount
  );

  switch (metricKey) {
    case "elo":
      return aggregate.eloCurrent;
    case "eloDelta":
      return aggregate.eloCurrent - aggregate.eloStart;
    case "score":
      return aggregate.score;
    case "totalPrestige":
      return aggregate.totalPrestige;
    case "directPrestige":
      return aggregate.directPrestige;
    case "assistPrestigeReceived":
      return aggregate.assistPrestigeReceived;
    case "assistPrestigeSent":
      return aggregate.assistPrestigeSent;
    case "assists":
      return aggregate.assists;
    case "contracts":
      return aggregate.contracts;
    case "failures":
      return aggregate.failures;
    case "wins":
      return aggregate.wins;
    case "games":
      return aggregate.games;
    case "winRate":
      return winRate * 100;
    case "avgPrestigePerGame":
      return safeDivide(totalPrestige, games);
    case "avgScorePerGame":
      return safeDivide(aggregate.score, games);
    case "allContractsEfficiency":
      return safeDivide(
        directPrestige + assistPrestigeReceived,
        contracts + assists
      );
    case "directEfficiency":
      return safeDivide(directPrestige, contracts);
    case "assistEfficiency":
    case "assistedEfficiency":
      return safeDivide(assistPrestigeReceived, assists);
    case "assistShare":
      return safeDivide(assistPrestigeReceived, totalPrestige) * 100;
    case "assistInPerGame":
      return safeDivide(assistPrestigeReceived, games);
    case "contractFailureRatio":
      return safeDivide(contracts, failures || 1);
    case "failureRate":
      return failureRate * 100;
    case "closeGames":
      return aggregate.closeGames;
    case "closeGameRate":
      return safeDivide(aggregate.closeGames, games) * 100;
    case "bestPrestigeMargin":
      return aggregate.bestPrestigeMargin;
    case "avgPrestigeMarginPerGame":
      return avgPrestigeMarginPerGame;
    case "avgStartSeat":
      return avgStartSeat;
    default:
      return 0;
  }
}

export function buildMetricSegments(
  metricKey: string,
  aggregate: PlayerAggregate
) {
  switch (metricKey) {
    case "totalPrestige":
    case "score":
      return [
        {
          key: "directPrestige",
          label: "Direct",
          value: aggregate.directPrestige,
          color: CHART_COLORS.blue,
        },
        {
          key: "objectivePrestige",
          label: "Objective",
          value: aggregate.objectivePrestige,
          color: CHART_COLORS.amber,
        },
        {
          key: "assistPrestigeReceived",
          label: "Assist In",
          value: aggregate.assistPrestigeReceived,
          color: CHART_COLORS.green,
        },
      ];
    default:
      return [
        {
          key: metricKey,
          label: getMetricOrFallback(metricKey).label,
          value: getAggregateMetricValue(metricKey, aggregate),
          color: CHART_COLORS.accent,
        },
      ];
  }
}

export function buildMetricDataMap(players: StorePlayer[], games: any[]) {
  const map: Record<string, StackedRow[]> = {};

  for (const metric of PLAYER_METRICS) {
    map[metric.key] = players.map((player) => {
      const aggregate = buildPlayerAggregate(player, games);
      return {
        id: player.id,
        label: player.name || "Unknown",
        color: player.color,
        segments: buildMetricSegments(metric.key, aggregate),
      };
    });
  }

  return map;
}

export function buildStackedMetricOptions(): MetricOption[] {
  return PLAYER_METRICS.map((metric) => ({
    key: metric.key,
    label: metric.label,
    shortLabel:
      metric.label.length > 16
        ? metric.label.replace(" Prestige", "")
        : metric.label,
    category: metric.category,
    description: metric.description,
  }));
}

export function normalizeReplayMetric(
  value: SimpleMetricKey
): ReplayMetricKey {
  return REPLAY_METRICS.includes(value as ReplayMetricKey)
    ? (value as ReplayMetricKey)
    : "totalPrestige";
}