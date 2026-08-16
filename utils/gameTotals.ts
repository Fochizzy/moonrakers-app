// utils/gameTotals.ts
//
// Normalization boundary for game totals. Inputs arrive from storage, cloud
// payloads, and imports, so they are typed `unknown` and validated here;
// everything downstream gets the concrete NormalizedPlayerTotals shape.

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function toNumber(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function hasFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function normalizeAssistMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as UnknownRecord)
      .map(([key, raw]) => [String(key).trim(), toNumber(raw)])
      .filter(([key]) => Boolean(key))
  );
}

export function getObjectiveCountFromTotals(t: unknown): number {
  const source = asRecord(t);

  if (hasFiniteNumber(source.objectiveCount)) {
    return Math.max(0, Math.floor(source.objectiveCount));
  }

  if (hasFiniteNumber(source.objectivePrestige)) {
    return Math.max(0, Math.floor(source.objectivePrestige));
  }

  return 0;
}

export type NormalizedPlayerTotals = UnknownRecord & {
  directPrestige: number;
  assistPrestigeReceived: number;
  assistPrestigeSent: number;
  objectiveCount: number;
  objectivePrestige: number;
  prestige: number;
  totalPrestige: number;
  score: number;
  assists: number;
  failures: number;
  contracts: number;
  performance: number;
  efficiency: number;
  assistedEfficiency: number;
  directEfficiency: number;
  assistCountBySource: Record<string, number>;
  assistPrestigeBySource: Record<string, number>;
};

/**
 * Normalize totals object for a single player.
 * Objective data is optional and safely defaults to 0.
 */
export function normalizeTotals(t: unknown): NormalizedPlayerTotals {
  const source = asRecord(t);
  const objectiveCount = getObjectiveCountFromTotals(source);

  const direct = toNumber(source.directPrestige);
  const assist = toNumber(source.assistPrestigeReceived);

  const totalPrestige =
    toNumber(source.totalPrestige ?? source.prestige) ||
    direct + assist + objectiveCount;

  return {
    ...source,
    directPrestige: direct,
    assistPrestigeReceived: assist,
    assistPrestigeSent: toNumber(source.assistPrestigeSent),

    objectiveCount,
    objectivePrestige: objectiveCount,

    prestige: totalPrestige,
    totalPrestige,

    score: toNumber(source.score),
    assists: toNumber(source.assists),
    failures: toNumber(source.failures),
    contracts: toNumber(source.contracts),

    performance: toNumber(source.performance),
    efficiency: toNumber(source.efficiency),
    assistedEfficiency: toNumber(source.assistedEfficiency),
    directEfficiency: toNumber(source.directEfficiency),

    assistCountBySource: normalizeAssistMap(source.assistCountBySource),
    assistPrestigeBySource: normalizeAssistMap(source.assistPrestigeBySource),
  };
}

function computeWinnerIdFromTotals(totals: Record<string, unknown>) {
  let bestId: string | undefined;
  let bestPrestige = -Infinity;

  for (const [playerId, rawTotals] of Object.entries(totals ?? {})) {
    const t = asRecord(rawTotals);
    const prestige =
      toNumber(t.totalPrestige ?? t.prestige) ||
      toNumber(t.directPrestige) +
        toNumber(t.assistPrestigeReceived) +
        getObjectiveCountFromTotals(t);

    if (prestige > bestPrestige) {
      bestPrestige = prestige;
      bestId = playerId;
    }
  }

  return bestId;
}

type TotalsAccumulator = {
  directPrestige: number;
  assistPrestigeReceived: number;
  assistPrestigeSent: number;
  objectiveCount: number;
  objectivePrestige: number;
  assists: number;
  failures: number;
  contracts: number;
  score: number;
  assistCountBySource: Record<string, number>;
  assistPrestigeBySource: Record<string, number>;
};

function createEmptyAccumulator(): TotalsAccumulator {
  return {
    directPrestige: 0,
    assistPrestigeReceived: 0,
    assistPrestigeSent: 0,
    objectiveCount: 0,
    objectivePrestige: 0,
    assists: 0,
    failures: 0,
    contracts: 0,
    score: 0,
    assistCountBySource: {},
    assistPrestigeBySource: {},
  };
}

/**
 * Compute totals from rounds if totals are missing or incomplete.
 * Objective data is optional and defaults to 0.
 */
export function computeTotalsFromRounds(
  game: unknown
): Record<string, TotalsAccumulator> {
  const totals: Record<string, TotalsAccumulator> = {};

  const ensure = (playerId: string) =>
    (totals[playerId] ??= createEmptyAccumulator());

  for (const rawRound of asArray(asRecord(game).rounds)) {
    const round = asRecord(rawRound);
    const playerId = String(round.playerId ?? '').trim();
    if (!playerId) continue;

    const t = ensure(playerId);

    t.directPrestige += toNumber(round.prestige);
    t.contracts += toNumber(round.contracts);
    t.failures += toNumber(round.failures);

    const objective = Math.max(
      0,
      Math.floor(toNumber(round.objectiveCount ?? round.objectivePrestige))
    );

    t.objectiveCount += objective;
    t.objectivePrestige += objective;

    for (const [target, value] of Object.entries(asRecord(round.assistRecipients))) {
      const v = toNumber(value);

      t.assists += v;

      const targetTotals = ensure(target);
      targetTotals.assistCountBySource = {
        ...targetTotals.assistCountBySource,
        [playerId]: toNumber(targetTotals.assistCountBySource[playerId]) + v,
      };
    }

    for (const [target, value] of Object.entries(
      asRecord(round.assistPrestigeRecipients)
    )) {
      const v = toNumber(value);

      t.assistPrestigeSent += v;

      const targetTotals = ensure(target);
      targetTotals.assistPrestigeReceived += v;
      targetTotals.assistPrestigeBySource = {
        ...targetTotals.assistPrestigeBySource,
        [playerId]: toNumber(targetTotals.assistPrestigeBySource[playerId]) + v,
      };
    }
  }

  return totals;
}

function hasOwnNumber(obj: unknown, key: string) {
  const source = asRecord(obj);
  return (
    Object.prototype.hasOwnProperty.call(source, key) &&
    hasFiniteNumber(source[key])
  );
}

function chooseNumber(existing: unknown, computed: unknown, key: string) {
  if (hasOwnNumber(existing, key)) return toNumber(asRecord(existing)[key]);
  if (hasOwnNumber(computed, key)) return toNumber(asRecord(computed)[key]);
  return 0;
}

function hasObjectiveField(value: unknown) {
  const source = asRecord(value);
  return (
    Object.prototype.hasOwnProperty.call(source, 'objectiveCount') ||
    Object.prototype.hasOwnProperty.call(source, 'objectivePrestige')
  );
}

function chooseObjectiveCount(existing: unknown, computed: unknown) {
  if (hasObjectiveField(existing)) {
    return getObjectiveCountFromTotals(existing);
  }

  if (hasObjectiveField(computed)) {
    return getObjectiveCountFromTotals(computed);
  }

  return 0;
}

function chooseAssistMap(existing: unknown, computed: unknown) {
  const existingMap = normalizeAssistMap(asRecord(existing).assistPrestigeBySource);
  if (Object.keys(existingMap).length > 0) {
    return existingMap;
  }
  return normalizeAssistMap(asRecord(computed).assistPrestigeBySource);
}

function chooseAssistCountMap(existing: unknown, computed: unknown) {
  const existingMap = normalizeAssistMap(asRecord(existing).assistCountBySource);
  if (Object.keys(existingMap).length > 0) {
    return existingMap;
  }
  return normalizeAssistMap(asRecord(computed).assistCountBySource);
}

function mergeExistingAndComputedTotals(existing: unknown, computed: unknown) {
  const objectiveCount = chooseObjectiveCount(existing, computed);
  const directPrestige = chooseNumber(existing, computed, 'directPrestige');
  const assistPrestigeReceived = chooseNumber(existing, computed, 'assistPrestigeReceived');
  const assistPrestigeSent = chooseNumber(existing, computed, 'assistPrestigeSent');
  const score = chooseNumber(existing, computed, 'score');
  const assists = chooseNumber(existing, computed, 'assists');
  const failures = chooseNumber(existing, computed, 'failures');
  const contracts = chooseNumber(existing, computed, 'contracts');
  const performance = chooseNumber(existing, computed, 'performance');
  const efficiency = chooseNumber(existing, computed, 'efficiency');
  const assistedEfficiency = chooseNumber(existing, computed, 'assistedEfficiency');
  const directEfficiency = chooseNumber(existing, computed, 'directEfficiency');

  const explicitTotalPrestige = hasOwnNumber(existing, 'totalPrestige')
    ? toNumber(asRecord(existing).totalPrestige)
    : hasOwnNumber(existing, 'prestige')
      ? toNumber(asRecord(existing).prestige)
      : hasOwnNumber(computed, 'totalPrestige')
        ? toNumber(asRecord(computed).totalPrestige)
        : hasOwnNumber(computed, 'prestige')
          ? toNumber(asRecord(computed).prestige)
          : directPrestige + assistPrestigeReceived + objectiveCount;

  return {
    ...asRecord(computed),
    ...asRecord(existing),
    directPrestige,
    assistPrestigeReceived,
    assistPrestigeSent,
    objectiveCount,
    objectivePrestige: objectiveCount,
    prestige: explicitTotalPrestige,
    totalPrestige: explicitTotalPrestige,
    score,
    assists,
    failures,
    contracts,
    performance,
    efficiency,
    assistedEfficiency,
    directEfficiency,
    assistCountBySource: chooseAssistCountMap(existing, computed),
    assistPrestigeBySource: chooseAssistMap(existing, computed),
  };
}

/**
 * Ensure a game has fully normalized totals.
 * If totals are missing, derive them from rounds.
 * If totals already exist, preserve explicit imported fields like score
 * and only backfill missing values from round-derived totals.
 */
export type NormalizedGameTotals = UnknownRecord & {
  winnerId: string | undefined;
  players: Array<UnknownRecord & NormalizedPlayerTotals>;
  totals: Record<string, NormalizedPlayerTotals>;
  rounds: unknown[];
  timeline: unknown[];
  roundCount: number;
};

export function normalizeGameWithComputedTotals(
  game: unknown
): NormalizedGameTotals {
  const source = asRecord(game);
  const rounds = asArray(source.rounds);
  const explicitTotals = asRecord(source.totals);
  const computedTotals = rounds.length > 0 ? computeTotalsFromRounds(source) : {};

  const allPlayerIds = new Set<string>([
    ...Object.keys(explicitTotals),
    ...Object.keys(computedTotals),
    ...asArray(source.players)
      .map((player) => String(asRecord(player).id ?? '').trim())
      .filter(Boolean),
  ]);

  const normalizedTotals: Record<string, NormalizedPlayerTotals> = {};

  for (const playerId of allPlayerIds) {
    normalizedTotals[playerId] = normalizeTotals(
      mergeExistingAndComputedTotals(
        explicitTotals[playerId] ?? {},
        computedTotals[playerId] ?? {}
      )
    );
  }

  const normalizedPlayers = asArray(source.players).map((rawPlayer) => {
    const player = asRecord(rawPlayer);
    const totals = normalizedTotals[String(player.id ?? '')] ?? {};
    const normalized = normalizeTotals(totals);

    return {
      ...player,
      prestige: normalized.totalPrestige,
      totalPrestige: normalized.totalPrestige,
      directPrestige: normalized.directPrestige,
      assistPrestigeReceived: normalized.assistPrestigeReceived,
      assistPrestigeSent: normalized.assistPrestigeSent,
      assistCountBySource: normalized.assistCountBySource,
      assistPrestigeBySource: normalized.assistPrestigeBySource,
      objectiveCount: normalized.objectiveCount,
      objectivePrestige: normalized.objectivePrestige,
      score: normalized.score,
      assists: normalized.assists,
      failures: normalized.failures,
      contracts: normalized.contracts,
      performance: normalized.performance,
      efficiency: normalized.efficiency,
      assistedEfficiency: normalized.assistedEfficiency,
      directEfficiency: normalized.directEfficiency,
    };
  });

  const resolvedWinnerId =
    (typeof source.winnerId === 'string' && source.winnerId.trim()
      ? source.winnerId
      : undefined) ?? computeWinnerIdFromTotals(normalizedTotals);

  return {
    ...source,
    winnerId: resolvedWinnerId,
    players: normalizedPlayers,
    totals: normalizedTotals,
    rounds,
    timeline: [...rounds, ...asArray(source.timeline)].sort(
      (a, b) => toNumber(asRecord(a).createdAt) - toNumber(asRecord(b).createdAt)
    ),
    roundCount: hasFiniteNumber(source.roundCount)
      ? source.roundCount
      : Array.isArray(source.rounds)
        ? rounds.length
        : asArray(source.timeline).length,
  };
}

/**
 * Convenience accessor.
 */
export function getTotalPrestigeFromTotals(t: unknown): number {
  return normalizeTotals(t).totalPrestige;
}

/**
 * Resolve winner from any supported winner field.
 */
export function getWinnerIdFromGame(game: unknown): string | undefined {
  if (!game || typeof game !== 'object') return undefined;

  const source = asRecord(game);
  const winnerId =
    source.winnerId ?? source.selectedWinnerId ?? source.manualWinnerId ?? undefined;

  return typeof winnerId === 'string' && winnerId.trim()
    ? winnerId
    : computeWinnerIdFromTotals(asRecord(source.totals));
}

/**
 * Safely get normalized totals for one player from a game.
 * Falls back to deriving totals from rounds if needed.
 */
export function getResolvedTotalsForPlayer(
  game: unknown,
  playerId: string
): NormalizedPlayerTotals {
  if (!playerId) {
    return normalizeTotals({});
  }

  const normalizedGame = normalizeGameWithComputedTotals(game);
  return normalizeTotals(normalizedGame.totals[playerId] ?? {});
}
