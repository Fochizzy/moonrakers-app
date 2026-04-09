// utils/gameTotals.ts

export function toNumber(v: any) {
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
    Object.entries(value as Record<string, unknown>)
      .map(([key, raw]) => [String(key).trim(), toNumber(raw)])
      .filter(([key]) => Boolean(key))
  );
}

export function getObjectiveCountFromTotals(t: any) {
  if (hasFiniteNumber(t?.objectiveCount)) {
    return Math.max(0, Math.floor(t.objectiveCount));
  }

  if (hasFiniteNumber(t?.objectivePrestige)) {
    return Math.max(0, Math.floor(t.objectivePrestige));
  }

  return 0;
}

/**
 * Normalize totals object for a single player.
 * Objective data is optional and safely defaults to 0.
 */
export function normalizeTotals(t: any) {
  const objectiveCount = getObjectiveCountFromTotals(t);

  const direct = toNumber(t?.directPrestige);
  const assist = toNumber(t?.assistPrestigeReceived);

  const totalPrestige =
    toNumber(t?.totalPrestige ?? t?.prestige) ||
    direct + assist + objectiveCount;

  return {
    ...t,
    directPrestige: direct,
    assistPrestigeReceived: assist,
    assistPrestigeSent: toNumber(t?.assistPrestigeSent),

    objectiveCount,
    objectivePrestige: objectiveCount,

    prestige: totalPrestige,
    totalPrestige,

    score: toNumber(t?.score),
    assists: toNumber(t?.assists),
    failures: toNumber(t?.failures),
    contracts: toNumber(t?.contracts),

    performance: toNumber(t?.performance),
    efficiency: toNumber(t?.efficiency),
    assistedEfficiency: toNumber(t?.assistedEfficiency),
    directEfficiency: toNumber(t?.directEfficiency),

    assistPrestigeBySource: normalizeAssistMap(t?.assistPrestigeBySource),
  };
}

function computeWinnerIdFromTotals(totals: Record<string, any>) {
  let bestId: string | undefined;
  let bestPrestige = -Infinity;

  for (const [playerId, rawTotals] of Object.entries(totals ?? {})) {
    const t = rawTotals as any;
    const prestige =
      toNumber(t?.totalPrestige ?? t?.prestige) ||
      toNumber(t?.directPrestige) +
        toNumber(t?.assistPrestigeReceived) +
        getObjectiveCountFromTotals(t);

    if (prestige > bestPrestige) {
      bestPrestige = prestige;
      bestId = playerId;
    }
  }

  return bestId;
}

/**
 * Compute totals from rounds if totals are missing or incomplete.
 * Objective data is optional and defaults to 0.
 */
export function computeTotalsFromRounds(game: any) {
  const totals: Record<string, any> = {};

  const rounds = Array.isArray(game?.rounds) ? game.rounds : [];

  for (const r of rounds) {
    if (!r?.playerId) continue;

    if (!totals[r.playerId]) {
      totals[r.playerId] = {
        directPrestige: 0,
        assistPrestigeReceived: 0,
        assistPrestigeSent: 0,
        objectiveCount: 0,
        objectivePrestige: 0,
        assists: 0,
        failures: 0,
        contracts: 0,
        score: 0,
        assistPrestigeBySource: {},
      };
    }

    const t = totals[r.playerId];

    t.directPrestige += toNumber(r.prestige);
    t.contracts += toNumber(r.contracts);
    t.failures += toNumber(r.failures);

    const objective = Math.max(
      0,
      Math.floor(toNumber(r?.objectiveCount ?? r?.objectivePrestige))
    );

    t.objectiveCount += objective;
    t.objectivePrestige += objective;

    const assistRecipients =
      r?.assistRecipients &&
      typeof r.assistRecipients === 'object' &&
      !Array.isArray(r.assistRecipients)
        ? r.assistRecipients
        : {};

    for (const value of Object.values(assistRecipients)) {
      t.assists += toNumber(value);
    }

    if (
      r?.assistPrestigeRecipients &&
      typeof r.assistPrestigeRecipients === 'object' &&
      !Array.isArray(r.assistPrestigeRecipients)
    ) {
      for (const [target, value] of Object.entries(r.assistPrestigeRecipients)) {
        const v = toNumber(value);

        t.assistPrestigeSent += v;

        if (!totals[target]) {
          totals[target] = {
            directPrestige: 0,
            assistPrestigeReceived: 0,
            assistPrestigeSent: 0,
            objectiveCount: 0,
            objectivePrestige: 0,
            assists: 0,
            failures: 0,
            contracts: 0,
            score: 0,
            assistPrestigeBySource: {},
          };
        }

        totals[target].assistPrestigeReceived += v;
        totals[target].assistPrestigeBySource = {
          ...(totals[target].assistPrestigeBySource ?? {}),
          [r.playerId]:
            toNumber(totals[target].assistPrestigeBySource?.[r.playerId]) + v,
        };
      }
    }
  }

  return totals;
}

function hasOwnNumber(obj: any, key: string) {
  return Object.prototype.hasOwnProperty.call(obj ?? {}, key) && hasFiniteNumber(obj?.[key]);
}

function chooseNumber(existing: any, computed: any, key: string) {
  if (hasOwnNumber(existing, key)) return toNumber(existing[key]);
  if (hasOwnNumber(computed, key)) return toNumber(computed[key]);
  return 0;
}

function chooseObjectiveCount(existing: any, computed: any) {
  if (
    Object.prototype.hasOwnProperty.call(existing ?? {}, 'objectiveCount') ||
    Object.prototype.hasOwnProperty.call(existing ?? {}, 'objectivePrestige')
  ) {
    return getObjectiveCountFromTotals(existing);
  }

  if (
    Object.prototype.hasOwnProperty.call(computed ?? {}, 'objectiveCount') ||
    Object.prototype.hasOwnProperty.call(computed ?? {}, 'objectivePrestige')
  ) {
    return getObjectiveCountFromTotals(computed);
  }

  return 0;
}

function chooseAssistMap(existing: any, computed: any) {
  const existingMap = normalizeAssistMap(existing?.assistPrestigeBySource);
  if (Object.keys(existingMap).length > 0) {
    return existingMap;
  }
  return normalizeAssistMap(computed?.assistPrestigeBySource);
}

function mergeExistingAndComputedTotals(existing: any, computed: any) {
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
    ? toNumber(existing.totalPrestige)
    : hasOwnNumber(existing, 'prestige')
      ? toNumber(existing.prestige)
      : hasOwnNumber(computed, 'totalPrestige')
        ? toNumber(computed.totalPrestige)
        : hasOwnNumber(computed, 'prestige')
          ? toNumber(computed.prestige)
          : directPrestige + assistPrestigeReceived + objectiveCount;

  return {
    ...(computed ?? {}),
    ...(existing ?? {}),
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
    assistPrestigeBySource: chooseAssistMap(existing, computed),
  };
}

/**
 * Ensure a game has fully normalized totals.
 * If totals are missing, derive them from rounds.
 * If totals already exist, preserve explicit imported fields like score
 * and only backfill missing values from round-derived totals.
 */
export function normalizeGameWithComputedTotals(game: any) {
  const hasRounds = Array.isArray(game?.rounds) && game.rounds.length > 0;
  const explicitTotals =
    game?.totals && typeof game.totals === 'object' && !Array.isArray(game.totals)
      ? game.totals
      : {};
  const computedTotals = hasRounds ? computeTotalsFromRounds(game) : {};

  const allPlayerIds = new Set<string>([
    ...Object.keys(explicitTotals ?? {}),
    ...Object.keys(computedTotals ?? {}),
    ...(Array.isArray(game?.players)
      ? game.players
          .map((player: any) => String(player?.id ?? '').trim())
          .filter(Boolean)
      : []),
  ]);

  const normalizedTotals: Record<string, any> = {};

  for (const playerId of allPlayerIds) {
    normalizedTotals[playerId] = normalizeTotals(
      mergeExistingAndComputedTotals(
        explicitTotals?.[playerId] ?? {},
        computedTotals?.[playerId] ?? {}
      )
    );
  }

  const normalizedPlayers = Array.isArray(game?.players)
    ? game.players.map((player: any) => {
        const totals = normalizedTotals[player?.id] ?? {};
        const normalized = normalizeTotals(totals);

        return {
          ...player,
          prestige: normalized.totalPrestige,
          totalPrestige: normalized.totalPrestige,
          directPrestige: normalized.directPrestige,
          assistPrestigeReceived: normalized.assistPrestigeReceived,
          assistPrestigeSent: normalized.assistPrestigeSent,
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
      })
    : [];

  const resolvedWinnerId =
    (typeof game?.winnerId === 'string' && game.winnerId.trim()
      ? game.winnerId
      : undefined) ?? computeWinnerIdFromTotals(normalizedTotals);

  return {
    ...game,
    winnerId: resolvedWinnerId,
    players: normalizedPlayers,
    totals: normalizedTotals,
    rounds: Array.isArray(game?.rounds) ? game.rounds : [],
    timeline: [
      ...(Array.isArray(game?.rounds) ? game.rounds : []),
      ...(Array.isArray(game?.timeline) ? game.timeline : []),
    ].sort((a: any, b: any) => toNumber(a?.createdAt) - toNumber(b?.createdAt)),
    roundCount:
      typeof game?.roundCount === 'number' && Number.isFinite(game.roundCount)
        ? game.roundCount
        : Array.isArray(game?.rounds)
          ? game.rounds.length
          : Array.isArray(game?.timeline)
            ? game.timeline.length
            : 0,
  };
}

/**
 * Convenience accessor.
 */
export function getTotalPrestigeFromTotals(t: any) {
  return normalizeTotals(t).totalPrestige;
}

/**
 * Resolve winner from any supported winner field.
 */
export function getWinnerIdFromGame(game: any): string | undefined {
  if (!game || typeof game !== 'object') return undefined;

  const winnerId =
    game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId ?? undefined;

  return typeof winnerId === 'string' && winnerId.trim()
    ? winnerId
    : computeWinnerIdFromTotals(game?.totals ?? {});
}

/**
 * Safely get normalized totals for one player from a game.
 * Falls back to deriving totals from rounds if needed.
 */
export function getResolvedTotalsForPlayer(game: any, playerId: string) {
  if (!playerId) {
    return normalizeTotals({});
  }

  const normalizedGame = normalizeGameWithComputedTotals(game);
  return normalizeTotals(normalizedGame?.totals?.[playerId] ?? {});
}
