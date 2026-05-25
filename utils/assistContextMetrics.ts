import { getWinnerId, type Game } from "@/utils/statsEngine";

export type AssistContextEvent = {
  gameId: string;
  assisterId: string;
  targetId: string;
  preAssistPrestige: number;
  targetPrestige: number;
  leaderPrestige: number;
  gapToTarget: number;
  gapToLeader: number;
  countedAsSixPlus: 0 | 1;
  countedWhileFiveBehindLeader: 0 | 1;
  assistPrestigeGained: number;
};

export type AssistContextGameSample = {
  gameId: string;
  playerId: string;
  assistCount: number;
  avgGapToTarget: number | null;
  avgGapToLeader: number | null;
  assistsAtSixPlus: number;
  assistsWhileFiveBehindLeader: number;
  totalAssistPrestigeGained: number;
  winFlag: 0 | 1;
  hasTrackedAssistContext: boolean;
};

type RoundLike = {
  playerId?: string;
  participantId?: string;
  participant_id?: string;
  prestige?: unknown;
  assistRecipients?: Record<string, unknown>;
  assistPrestigeRecipients?: Record<string, unknown>;
  metaType?: string;
};

type TotalsLike = {
  assistPrestigeBySource?: unknown;
  assistPrestigeByPlayer?: unknown;
  assistPrestigeFromPlayers?: unknown;
  assistSources?: unknown;
  assistCountBySource?: unknown;
};

type AssistSourceRollup = {
  assistCount: number;
  totalAssistPrestige: number;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function isAssistRecipientMap(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeAssistMap(value: unknown) {
  if (!isAssistRecipientMap(value)) {
    return {} as Record<string, number>;
  }

  const out: Record<string, number> = {};

  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = String(rawKey ?? "").trim();
    if (!key) {
      continue;
    }

    out[key] = Math.max(0, toNumber(rawValue));
  }

  return out;
}

function isBonusRound(round: RoundLike) {
  return round?.metaType === "bonusObjective";
}

function getRounds(game: Game): RoundLike[] {
  if (Array.isArray((game as Game & { rounds?: RoundLike[] }).rounds)) {
    return (game as Game & { rounds?: RoundLike[] }).rounds ?? [];
  }

  if (Array.isArray((game as Game & { timeline?: RoundLike[] }).timeline)) {
    return (game as Game & { timeline?: RoundLike[] }).timeline ?? [];
  }

  return [];
}

function getActorId(round: RoundLike) {
  return String(
    round?.playerId ?? round?.participantId ?? round?.participant_id ?? "",
  ).trim();
}

function getPlayerIds(game: Game, rounds: RoundLike[]) {
  const playerIds = new Set<string>();

  for (const player of game.players ?? []) {
    const playerId = String(player?.id ?? "").trim();
    if (playerId) {
      playerIds.add(playerId);
    }
  }

  for (const playerId of Object.keys(game.totals ?? {})) {
    const normalized = String(playerId).trim();
    if (normalized) {
      playerIds.add(normalized);
    }

    const totalsEntry = (game.totals?.[playerId] ?? {}) as TotalsLike;
    const assistSourceMaps = [
      totalsEntry.assistPrestigeBySource,
      totalsEntry.assistPrestigeByPlayer,
      totalsEntry.assistPrestigeFromPlayers,
      totalsEntry.assistSources,
      totalsEntry.assistCountBySource,
    ];

    for (const assistSourceMap of assistSourceMaps) {
      for (const sourceId of Object.keys(normalizeAssistMap(assistSourceMap))) {
        playerIds.add(sourceId);
      }
    }
  }

  for (const round of rounds) {
    const actorId = getActorId(round);
    if (actorId) {
      playerIds.add(actorId);
    }

    if (!isAssistRecipientMap(round?.assistRecipients)) {
      continue;
    }

    for (const targetId of Object.keys(round.assistRecipients)) {
      const normalized = String(targetId).trim();
      if (normalized) {
        playerIds.add(normalized);
      }
    }

    if (!isAssistRecipientMap(round?.assistPrestigeRecipients)) {
      continue;
    }

    for (const targetId of Object.keys(round.assistPrestigeRecipients)) {
      const normalized = String(targetId).trim();
      if (normalized) {
        playerIds.add(normalized);
      }
    }
  }

  return Array.from(playerIds);
}

function hasTrackedAssistContext(rounds: RoundLike[]) {
  return rounds.some((round) => Object.prototype.hasOwnProperty.call(round, "assistRecipients"));
}

function getAssistPrestigeBySourceMap(totals: TotalsLike | undefined) {
  return {
    ...normalizeAssistMap(totals?.assistPrestigeBySource),
    ...normalizeAssistMap(totals?.assistPrestigeByPlayer),
    ...normalizeAssistMap(totals?.assistPrestigeFromPlayers),
    ...normalizeAssistMap(totals?.assistSources),
  };
}

function getAssistCountBySourceMap(totals: TotalsLike | undefined) {
  return normalizeAssistMap(totals?.assistCountBySource);
}

function setNestedValue(
  target: Record<string, Record<string, number>>,
  outerKey: string,
  innerKey: string,
  value: number,
) {
  if (!outerKey || !innerKey) {
    return;
  }

  if (value <= 0) {
    if (!target[outerKey]) {
      return;
    }

    delete target[outerKey][innerKey];
    if (Object.keys(target[outerKey]).length === 0) {
      delete target[outerKey];
    }
    return;
  }

  target[outerKey] = target[outerKey] ?? {};
  target[outerKey][innerKey] = value;
}

function getNestedValue(
  target: Record<string, Record<string, number>>,
  outerKey: string,
  innerKey: string,
) {
  return Math.max(0, toNumber(target?.[outerKey]?.[innerKey]));
}

function addNestedValue(
  target: Record<string, Record<string, number>>,
  outerKey: string,
  innerKey: string,
  value: number,
) {
  if (value <= 0) {
    return;
  }

  setNestedValue(
    target,
    outerKey,
    innerKey,
    getNestedValue(target, outerKey, innerKey) + value,
  );
}

function buildRoundAssistCountsByTargetSource(rounds: RoundLike[]) {
  const counts: Record<string, Record<string, number>> = {};

  for (const round of rounds) {
    if (isBonusRound(round) || !isAssistRecipientMap(round?.assistRecipients)) {
      continue;
    }

    const targetId = getActorId(round);
    if (!targetId) {
      continue;
    }

    for (const [rawAssisterId, rawCount] of Object.entries(round.assistRecipients)) {
      const assisterId = String(rawAssisterId ?? "").trim();
      const assistCount = Math.max(0, Math.floor(toNumber(rawCount)));

      if (!assisterId || assistCount <= 0) {
        continue;
      }

      addNestedValue(counts, targetId, assisterId, assistCount);
    }
  }

  return counts;
}

function buildAssistSourceState(game: Game, rounds: RoundLike[]) {
  const roundAssistCountsByTargetSource = buildRoundAssistCountsByTargetSource(rounds);
  const remainingPrestigeByTargetSource: Record<string, Record<string, number>> = {};
  const remainingCountByTargetSource: Record<string, Record<string, number>> = {};
  const sourceTotalsByPlayer: Record<string, AssistSourceRollup> = {};

  for (const [targetId, rawTotals] of Object.entries(game.totals ?? {})) {
    const totals = (rawTotals ?? {}) as TotalsLike;
    const assistPrestigeBySource = getAssistPrestigeBySourceMap(totals);
    const assistCountBySource = getAssistCountBySourceMap(totals);
    const knownSourceIds = new Set<string>([
      ...Object.keys(assistPrestigeBySource),
      ...Object.keys(assistCountBySource),
      ...Object.keys(roundAssistCountsByTargetSource[targetId] ?? {}),
    ]);

    for (const sourceId of knownSourceIds) {
      const totalAssistPrestige = Math.max(0, toNumber(assistPrestigeBySource[sourceId]));
      const assistCount = Math.max(
        0,
        toNumber(
          assistCountBySource[sourceId] ??
            roundAssistCountsByTargetSource[targetId]?.[sourceId],
        ),
      );

      setNestedValue(
        remainingPrestigeByTargetSource,
        targetId,
        sourceId,
        totalAssistPrestige,
      );
      setNestedValue(
        remainingCountByTargetSource,
        targetId,
        sourceId,
        assistCount,
      );

      sourceTotalsByPlayer[sourceId] = sourceTotalsByPlayer[sourceId] ?? {
        assistCount: 0,
        totalAssistPrestige: 0,
      };
      sourceTotalsByPlayer[sourceId].assistCount += assistCount;
      sourceTotalsByPlayer[sourceId].totalAssistPrestige += totalAssistPrestige;
    }
  }

  return {
    remainingPrestigeByTargetSource,
    remainingCountByTargetSource,
    sourceTotalsByPlayer,
  };
}

function consumeAssistSourceState(
  targetId: string,
  assisterId: string,
  prestigeUsed: number,
  assistCountUsed: number,
  state: {
    remainingPrestigeByTargetSource: Record<string, Record<string, number>>;
    remainingCountByTargetSource: Record<string, Record<string, number>>;
  },
) {
  const remainingPrestige =
    getNestedValue(state.remainingPrestigeByTargetSource, targetId, assisterId) - prestigeUsed;
  const remainingCount =
    getNestedValue(state.remainingCountByTargetSource, targetId, assisterId) - assistCountUsed;

  setNestedValue(
    state.remainingPrestigeByTargetSource,
    targetId,
    assisterId,
    remainingPrestige,
  );
  setNestedValue(
    state.remainingCountByTargetSource,
    targetId,
    assisterId,
    remainingCount,
  );
}

function inferAssistPrestigeFromTotals(
  targetId: string,
  assisterId: string,
  assistCount: number,
  state: {
    remainingPrestigeByTargetSource: Record<string, Record<string, number>>;
    remainingCountByTargetSource: Record<string, Record<string, number>>;
  },
) {
  const remainingAssistCount = getNestedValue(
    state.remainingCountByTargetSource,
    targetId,
    assisterId,
  );
  const remainingAssistPrestige = getNestedValue(
    state.remainingPrestigeByTargetSource,
    targetId,
    assisterId,
  );

  if (assistCount <= 0 || remainingAssistCount <= 0 || remainingAssistPrestige <= 0) {
    return 0;
  }

  const inferredAssistCount = Math.min(assistCount, remainingAssistCount);
  const perAssistPrestige = remainingAssistPrestige / remainingAssistCount;
  const inferredPrestige = perAssistPrestige * inferredAssistCount;

  consumeAssistSourceState(targetId, assisterId, inferredPrestige, inferredAssistCount, state);
  return inferredPrestige;
}

export function buildAssistContextEvents(games: Game[]): AssistContextEvent[] {
  const events: AssistContextEvent[] = [];

  for (const game of games ?? []) {
    const rounds = getRounds(game);
    if (!hasTrackedAssistContext(rounds)) {
      continue;
    }

    const assistSourceState = buildAssistSourceState(game, rounds);
    const playerIds = getPlayerIds(game, rounds);
    const runningPrestige = new Map<string, number>(
      playerIds.map((playerId) => [playerId, 0])
    );
    const gameId = String(game?.id ?? "");

    for (const round of rounds) {
      const targetId = getActorId(round);
      if (!targetId) {
        continue;
      }

      if (!runningPrestige.has(targetId)) {
        runningPrestige.set(targetId, 0);
      }

      const targetPrestige = runningPrestige.get(targetId) ?? 0;
      const leaderPrestige = Math.max(0, ...Array.from(runningPrestige.values()));
      const assistPrestigeRecipients = isAssistRecipientMap(round?.assistPrestigeRecipients)
        ? round.assistPrestigeRecipients
        : null;
      const helperPrestigeTotals = new Map<string, number>();

      if (!isBonusRound(round) && isAssistRecipientMap(round?.assistRecipients)) {
        for (const [rawAssisterId, rawCount] of Object.entries(round.assistRecipients)) {
          const assisterId = String(rawAssisterId).trim();
          const assistCount = Math.max(0, Math.floor(toNumber(rawCount)));

          if (!assisterId || assistCount <= 0) {
            continue;
          }

          if (!runningPrestige.has(assisterId)) {
            runningPrestige.set(assisterId, 0);
          }

          const preAssistPrestige = runningPrestige.get(assisterId) ?? 0;
          const gapToTarget = Math.abs(preAssistPrestige - targetPrestige);
          const gapToLeader = leaderPrestige - preAssistPrestige;
          const hasRecordedAssistPrestige = Boolean(
            assistPrestigeRecipients &&
              Object.prototype.hasOwnProperty.call(assistPrestigeRecipients, assisterId),
          );
          const assistPrestigeGainedTotal = hasRecordedAssistPrestige
            ? Math.max(0, toNumber(assistPrestigeRecipients?.[assisterId]))
            : inferAssistPrestigeFromTotals(
                targetId,
                assisterId,
                assistCount,
                assistSourceState,
              );

          if (hasRecordedAssistPrestige) {
            consumeAssistSourceState(
              targetId,
              assisterId,
              assistPrestigeGainedTotal,
              assistCount,
              assistSourceState,
            );
          }

          const assistPrestigeGained = assistPrestigeGainedTotal / assistCount;
          helperPrestigeTotals.set(assisterId, assistPrestigeGainedTotal);

          for (let index = 0; index < assistCount; index += 1) {
            events.push({
              gameId,
              assisterId,
              targetId,
              preAssistPrestige,
              targetPrestige,
              leaderPrestige,
              gapToTarget,
              gapToLeader,
              countedAsSixPlus: preAssistPrestige >= 6 ? 1 : 0,
              countedWhileFiveBehindLeader: gapToLeader > 5 ? 1 : 0,
              assistPrestigeGained,
            });
          }
        }
      }

      runningPrestige.set(targetId, targetPrestige + toNumber(round?.prestige));

      const helperIdsToUpdate = new Set<string>(helperPrestigeTotals.keys());
      for (const assisterId of Object.keys(assistPrestigeRecipients ?? {})) {
        helperIdsToUpdate.add(String(assisterId).trim());
      }

      for (const assisterId of helperIdsToUpdate) {
        if (!assisterId) {
          continue;
        }

        if (!runningPrestige.has(assisterId)) {
          runningPrestige.set(assisterId, 0);
        }

        const prestigeGained = helperPrestigeTotals.has(assisterId)
          ? helperPrestigeTotals.get(assisterId) ?? 0
          : Math.max(0, toNumber(assistPrestigeRecipients?.[assisterId]));

        runningPrestige.set(
          assisterId,
          (runningPrestige.get(assisterId) ?? 0) + prestigeGained,
        );
      }
    }
  }

  return events;
}

export function buildAssistContextGameSamples(games: Game[]): AssistContextGameSample[] {
  const allEvents = buildAssistContextEvents(games);
  const samples: AssistContextGameSample[] = [];
  const eventsByGamePlayer = new Map<string, AssistContextEvent[]>();

  for (const event of allEvents) {
    const key = `${event.gameId}:${event.assisterId}`;
    const existing = eventsByGamePlayer.get(key) ?? [];
    existing.push(event);
    eventsByGamePlayer.set(key, existing);
  }

  for (const game of games ?? []) {
    const rounds = getRounds(game);
    const gameId = String(game?.id ?? "");
    const winnerId = String(getWinnerId(game) ?? "").trim();
    const hasTrackedTiming = hasTrackedAssistContext(rounds);
    const assistSourceState = buildAssistSourceState(game, rounds);
    const playerIds = new Set<string>([
      ...getPlayerIds(game, rounds),
      ...Object.keys(assistSourceState.sourceTotalsByPlayer),
    ]);

    for (const playerId of playerIds) {
      const playerEvents = eventsByGamePlayer.get(`${gameId}:${playerId}`) ?? [];
      const sourceTotals = assistSourceState.sourceTotalsByPlayer[playerId] ?? {
        assistCount: 0,
        totalAssistPrestige: 0,
      };
      const totalAssistCount = Math.max(playerEvents.length, sourceTotals.assistCount);
      const totalAssistPrestigeGained =
        playerEvents.length > 0
          ? playerEvents.reduce((sum, event) => sum + event.assistPrestigeGained, 0)
          : sourceTotals.totalAssistPrestige;

      if (!hasTrackedTiming && totalAssistCount <= 0 && totalAssistPrestigeGained <= 0) {
        continue;
      }

      samples.push({
        gameId,
        playerId,
        assistCount: totalAssistCount,
        avgGapToTarget: playerEvents.length
          ? average(playerEvents.map((event) => event.gapToTarget))
          : null,
        avgGapToLeader: playerEvents.length
          ? average(playerEvents.map((event) => event.gapToLeader))
          : null,
        assistsAtSixPlus: playerEvents.reduce(
          (sum, event) => sum + event.countedAsSixPlus,
          0,
        ),
        assistsWhileFiveBehindLeader: playerEvents.reduce(
          (sum, event) => sum + event.countedWhileFiveBehindLeader,
          0,
        ),
        totalAssistPrestigeGained,
        winFlag: winnerId === playerId ? 1 : 0,
        hasTrackedAssistContext: hasTrackedTiming,
      });
    }
  }

  return samples;
}
