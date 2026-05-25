import {
  buildAssistContextEvents,
  buildAssistContextGameSamples,
} from "@/utils/assistContextMetrics";
import type { PlaystyleSample } from "@/utils/playstyleEngine";
import type { Game, Player } from "@/utils/statsEngine";

const MIN_PROFILE_GAMES = 3;
const MIN_SPLIT_GAMES = 3;
const MIN_SHARED_GAMES = 3;
const NOT_ENOUGH = "Not enough games yet";

export type MoonrakersConditionSummary = {
  label: string;
  winRate: number;
  avgPrestige: number;
  sampleSize: number;
  winRateLabel: string;
  avgPrestigeLabel: string;
  sampleSizeLabel: string;
};

export type MoonrakersPartnerSummary = {
  playerId: string;
  playerName: string;
  winRate: number;
  avgPrestige: number;
  sampleSize: number;
  winRateLabel: string;
  avgPrestigeLabel: string;
  sampleSizeLabel: string;
};

export type MoonrakersAssistTargetSummary = {
  playerId: string;
  playerName: string;
  assistsSent: number;
  sampleSize: number;
  assistsSentLabel: string;
  sampleSizeLabel: string;
};

export type MoonrakersPlaystyleSummary = {
  directPrestigePerGame: number;
  directPrestigePerGameLabel: string;
  assistPrestigeReceivedPerGame: number;
  assistPrestigeReceivedPerGameLabel: string;
  objectivePointsPerGame: number;
  objectivePointsPerGameLabel: string;
  baseTurnsPerGame: number;
  baseTurnsPerGameLabel: string;
  baseRate: number;
  baseRateLabel: string;
  styleRead: "Direct" | "Support" | "Objective" | "Balanced";
};

export type MoonrakersBaseDisciplineSummary = {
  baseRateLabel: string;
  baseTurnsPerGameLabel: string;
  winRateWithBaseLabel: string;
  winRateWithoutBaseLabel: string;
  prestigeWithBaseLabel: string;
  prestigeWithoutBaseLabel: string;
};

export type MoonrakersObjectiveProfileSummary = {
  objectivePointsPerGameLabel: string;
  gamesWithObjectivesLabel: string;
  winRateWithObjectivesLabel: string;
  winRateWithoutObjectivesLabel: string;
  prestigeWithObjectivesLabel: string;
  highObjectiveGamesLabel: string;
};

export type MoonrakersSupportProfileSummary = {
  assistsGivenPerGameLabel: string;
  assistsReceivedPerGameLabel: string;
  bestSupportPartner: MoonrakersPartnerSummary | null;
  mostCommonAssistTarget: MoonrakersAssistTargetSummary | null;
  supportStyle: "Giver" | "Receiver" | "Balanced";
};

export type MoonrakersAssistContextSummary = {
  assistGapToTargetLabel: string | null;
  assistGapToLeaderLabel: string | null;
  assistsAtSixPlusLabel: string | null;
  assistsOverFiveBehindLeaderLabel: string | null;
  assistPrestigeGainedLabel: string | null;
  assistPrestigePerAssistLabel: string | null;
  importHealthLabel: "Exact assist timing" | "Partial assist inference" | "No assist context";
  importHealthTone: "green" | "gold" | "red";
  importHealthSubLabel: string;
  assistEventsLabel: string;
  timedAssistEventsLabel: string;
  trackedGamesLabel: string;
};

export type MoonrakersIntelProfile =
  | {
      hasData: false;
      emptyTitle: string;
      emptyBody: string;
    }
  | {
      hasData: true;
      playstyle: MoonrakersPlaystyleSummary;
      bestCondition: MoonrakersConditionSummary | null;
      worstCondition: MoonrakersConditionSummary | null;
      baseDiscipline: MoonrakersBaseDisciplineSummary;
      objectiveProfile: MoonrakersObjectiveProfileSummary;
      supportProfile: MoonrakersSupportProfileSummary;
      assistContext: MoonrakersAssistContextSummary;
    };

export type BuildMoonrakersIntelProfileInput = {
  playerId: string;
  players: Array<Pick<Player, "id" | "name">>;
  games: Game[];
  samples: PlaystyleSample[];
};

type ConditionCandidate = {
  subject: string;
  winRate: number;
  avgPrestige: number;
  sampleSize: number;
};

type SharedPartnerAggregate = {
  playerId: string;
  playerName: string;
  sampleSize: number;
  wins: number;
  totalPrestige: number;
};

type AssistTargetAggregate = {
  playerId: string;
  playerName: string;
  assistsSent: number;
  sampleSize: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0.0";
  return value.toFixed(1);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

function formatRecord(count: number, total: number) {
  return `${count}/${total}`;
}

function formatCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatCountShareLabel(count: number, total: number) {
  if (total <= 0) {
    return null;
  }

  return `${count} (${formatPercent(count / total)})`;
}

function getAssistImportHealthSummary({
  timedAssistCount,
  totalAssistCount,
  trackedGameCount,
}: {
  timedAssistCount: number;
  totalAssistCount: number;
  trackedGameCount: number;
}) {
  if (totalAssistCount <= 0) {
    return {
      importHealthLabel: "No assist context" as const,
      importHealthTone: "red" as const,
      importHealthSubLabel: "No tracked or inferred assist data for this profile.",
    };
  }

  if (timedAssistCount > 0 && totalAssistCount === timedAssistCount) {
    return {
      importHealthLabel: "Exact assist timing" as const,
      importHealthTone: "green" as const,
      importHealthSubLabel: `${formatCountLabel(timedAssistCount, "timed assist")} across ${formatCountLabel(trackedGameCount, "tracked game")}.`,
    };
  }

  if (timedAssistCount > 0) {
    return {
      importHealthLabel: "Partial assist inference" as const,
      importHealthTone: "gold" as const,
      importHealthSubLabel: `${formatCountLabel(timedAssistCount, "timed assist")} plus ${formatCountLabel(
        Math.max(totalAssistCount - timedAssistCount, 0),
        "inferred assist",
      )} from saved totals.`,
    };
  }

  return {
    importHealthLabel: "Partial assist inference" as const,
    importHealthTone: "gold" as const,
    importHealthSubLabel: `${formatCountLabel(totalAssistCount, "inferred assist")} reconstructed from saved totals.`,
  };
}

function buildEmptyProfile(): MoonrakersIntelProfile {
  return {
    hasData: false,
    emptyTitle: "Not enough Moonrakers data yet",
    emptyBody:
      "Finish or import a few more games to unlock player-specific playstyle reads.",
  };
}

function getPlayerNameMap(players: Array<Pick<Player, "id" | "name">>) {
  return new Map(players.map((player) => [String(player.id), player.name]));
}

function withGuardLabel(samples: PlaystyleSample[], formatter: (rows: PlaystyleSample[]) => string) {
  return samples.length >= MIN_SPLIT_GAMES ? formatter(samples) : NOT_ENOUGH;
}

function getStyleRead(summary: {
  directPrestigePerGame: number;
  assistPrestigeReceivedPerGame: number;
  objectivePointsPerGame: number;
}): "Direct" | "Support" | "Objective" | "Balanced" {
  const values = [
    { key: "Direct", value: summary.directPrestigePerGame },
    { key: "Support", value: summary.assistPrestigeReceivedPerGame },
    { key: "Objective", value: summary.objectivePointsPerGame },
  ] as const;

  const sorted = [...values].sort((left, right) => right.value - left.value);
  if ((sorted[0]?.value ?? 0) <= 0) {
    return "Balanced";
  }

  const gap = (sorted[0]?.value ?? 0) - (sorted[1]?.value ?? 0);
  if (gap < 0.75) {
    return "Balanced";
  }

  return sorted[0].key;
}

function getSupportStyle(samples: PlaystyleSample[]): "Giver" | "Receiver" | "Balanced" {
  const assistsGiven = average(samples.map((sample) => sample.assistsGiven));
  const assistsReceived = average(samples.map((sample) => sample.assistsReceived));

  if (assistsGiven - assistsReceived >= 0.5) {
    return "Giver";
  }

  if (assistsReceived - assistsGiven >= 0.5) {
    return "Receiver";
  }

  return "Balanced";
}

function buildConditionCandidate(subject: string, samples: PlaystyleSample[]) {
  if (samples.length < MIN_SPLIT_GAMES) {
    return null;
  }

  const winRate = average(samples.map((sample) => sample.winFlag));
  const avgPrestige = average(samples.map((sample) => sample.totalPrestige));

  return {
    subject,
    winRate,
    avgPrestige,
    sampleSize: samples.length,
  } satisfies ConditionCandidate;
}

function getTableSizeLabel(tableSize: number) {
  return tableSize >= 5 ? "5p+" : `${tableSize}p`;
}

function getSeatBand(sample: PlaystyleSample) {
  if (!isFiniteNumber(sample.seat) || sample.tableSize <= 1) {
    return null;
  }

  if (sample.seat === 1) {
    return "Early";
  }

  if (sample.seat === sample.tableSize) {
    return "Late";
  }

  return "Middle";
}

function buildConditionCandidates(samples: PlaystyleSample[]) {
  const candidates: ConditionCandidate[] = [];
  const byTableSize = new Map<string, PlaystyleSample[]>();
  const bySeatBand = new Map<string, PlaystyleSample[]>();

  samples.forEach((sample) => {
    const tableSizeLabel = getTableSizeLabel(sample.tableSize);
    byTableSize.set(tableSizeLabel, [...(byTableSize.get(tableSizeLabel) ?? []), sample]);

    const seatBand = getSeatBand(sample);
    if (seatBand) {
      bySeatBand.set(seatBand, [...(bySeatBand.get(seatBand) ?? []), sample]);
    }
  });

  byTableSize.forEach((rows, label) => {
    const candidate = buildConditionCandidate(`in ${label}`, rows);
    if (candidate) candidates.push(candidate);
  });

  bySeatBand.forEach((rows, label) => {
    const candidate = buildConditionCandidate(`from ${label} Seat`, rows);
    if (candidate) candidates.push(candidate);
  });

  const withBase = buildConditionCandidate(
    "with Base Turns",
    samples.filter((sample) => sample.stayAtBaseTurns > 0)
  );
  if (withBase) candidates.push(withBase);

  const withoutBase = buildConditionCandidate(
    "without Base Turns",
    samples.filter((sample) => sample.stayAtBaseTurns === 0)
  );
  if (withoutBase) candidates.push(withoutBase);

  const withObjectives = buildConditionCandidate(
    "with Objectives",
    samples.filter((sample) => sample.objectivePoints > 0)
  );
  if (withObjectives) candidates.push(withObjectives);

  const withoutObjectives = buildConditionCandidate(
    "without Objectives",
    samples.filter((sample) => sample.objectivePoints === 0)
  );
  if (withoutObjectives) candidates.push(withoutObjectives);

  return candidates;
}

function compareBestConditions(left: ConditionCandidate, right: ConditionCandidate) {
  if (right.winRate !== left.winRate) {
    return right.winRate - left.winRate;
  }

  if (right.avgPrestige !== left.avgPrestige) {
    return right.avgPrestige - left.avgPrestige;
  }

  if (right.sampleSize !== left.sampleSize) {
    return right.sampleSize - left.sampleSize;
  }

  return left.subject.localeCompare(right.subject);
}

function compareWorstConditions(left: ConditionCandidate, right: ConditionCandidate) {
  if (left.winRate !== right.winRate) {
    return left.winRate - right.winRate;
  }

  if (left.avgPrestige !== right.avgPrestige) {
    return left.avgPrestige - right.avgPrestige;
  }

  if (right.sampleSize !== left.sampleSize) {
    return right.sampleSize - left.sampleSize;
  }

  return left.subject.localeCompare(right.subject);
}

function formatConditionSummary(prefix: "Best" | "Worst", candidate: ConditionCandidate) {
  return {
    label: `${prefix} ${candidate.subject}`,
    winRate: candidate.winRate,
    avgPrestige: candidate.avgPrestige,
    sampleSize: candidate.sampleSize,
    winRateLabel: formatPercent(candidate.winRate),
    avgPrestigeLabel: formatNumber(candidate.avgPrestige),
    sampleSizeLabel: `${candidate.sampleSize} games`,
  } satisfies MoonrakersConditionSummary;
}

function buildPlaystyleSummary(samples: PlaystyleSample[]): MoonrakersPlaystyleSummary {
  const directPrestigePerGame = average(samples.map((sample) => sample.directPrestige));
  const assistPrestigeReceivedPerGame = average(
    samples.map((sample) => sample.assistPrestigeReceived)
  );
  const objectivePointsPerGame = average(samples.map((sample) => sample.objectivePoints));
  const baseTurnsPerGame = average(samples.map((sample) => sample.stayAtBaseTurns));
  const validBaseRates = samples
    .map((sample) => sample.stayAtBaseRate)
    .filter(isFiniteNumber);
  const baseRate = average(validBaseRates);

  return {
    directPrestigePerGame,
    directPrestigePerGameLabel: formatNumber(directPrestigePerGame),
    assistPrestigeReceivedPerGame,
    assistPrestigeReceivedPerGameLabel: formatNumber(assistPrestigeReceivedPerGame),
    objectivePointsPerGame,
    objectivePointsPerGameLabel: formatNumber(objectivePointsPerGame),
    baseTurnsPerGame,
    baseTurnsPerGameLabel: formatNumber(baseTurnsPerGame),
    baseRate,
    baseRateLabel: formatPercent(baseRate),
    styleRead: getStyleRead({
      directPrestigePerGame,
      assistPrestigeReceivedPerGame,
      objectivePointsPerGame,
    }),
  };
}

function buildBaseDisciplineSummary(
  samples: PlaystyleSample[]
): MoonrakersBaseDisciplineSummary {
  const validBaseRates = samples
    .map((sample) => sample.stayAtBaseRate)
    .filter(isFiniteNumber);
  const withBase = samples.filter((sample) => sample.stayAtBaseTurns > 0);
  const withoutBase = samples.filter((sample) => sample.stayAtBaseTurns === 0);

  return {
    baseRateLabel: formatPercent(average(validBaseRates)),
    baseTurnsPerGameLabel: formatNumber(
      average(samples.map((sample) => sample.stayAtBaseTurns))
    ),
    winRateWithBaseLabel: withGuardLabel(withBase, (rows) =>
      formatPercent(average(rows.map((row) => row.winFlag)))
    ),
    winRateWithoutBaseLabel: withGuardLabel(withoutBase, (rows) =>
      formatPercent(average(rows.map((row) => row.winFlag)))
    ),
    prestigeWithBaseLabel: withGuardLabel(withBase, (rows) =>
      formatNumber(average(rows.map((row) => row.totalPrestige)))
    ),
    prestigeWithoutBaseLabel: withGuardLabel(withoutBase, (rows) =>
      formatNumber(average(rows.map((row) => row.totalPrestige)))
    ),
  };
}

function buildObjectiveProfileSummary(
  samples: PlaystyleSample[]
): MoonrakersObjectiveProfileSummary {
  const withObjectives = samples.filter((sample) => sample.objectivePoints > 0);
  const withoutObjectives = samples.filter((sample) => sample.objectivePoints === 0);
  const highObjectiveGames = samples.filter((sample) => sample.objectivePoints >= 2);

  return {
    objectivePointsPerGameLabel: formatNumber(
      average(samples.map((sample) => sample.objectivePoints))
    ),
    gamesWithObjectivesLabel: formatRecord(withObjectives.length, samples.length),
    winRateWithObjectivesLabel: withGuardLabel(withObjectives, (rows) =>
      formatPercent(average(rows.map((row) => row.winFlag)))
    ),
    winRateWithoutObjectivesLabel: withGuardLabel(withoutObjectives, (rows) =>
      formatPercent(average(rows.map((row) => row.winFlag)))
    ),
    prestigeWithObjectivesLabel: withGuardLabel(withObjectives, (rows) =>
      formatNumber(average(rows.map((row) => row.totalPrestige)))
    ),
    highObjectiveGamesLabel: formatRecord(highObjectiveGames.length, samples.length),
  };
}

function getRounds(game: Game): any[] {
  if (Array.isArray((game as any)?.rounds)) {
    return (game as any).rounds;
  }

  if (Array.isArray((game as any)?.timeline)) {
    return (game as any).timeline;
  }

  return [];
}

function buildBestSupportPartner(
  playerId: string,
  playerNameMap: Map<string, string>,
  games: Game[],
  samplesByGameId: Map<string, PlaystyleSample>
) {
  const aggregateByPartner = new Map<string, SharedPartnerAggregate>();

  games.forEach((game) => {
    const playersInGame = Array.isArray(game?.players)
      ? game.players.map((entry) => String((entry as any)?.id)).filter(Boolean)
      : Object.keys(game?.totals ?? {}).filter(Boolean);

    if (!playersInGame.includes(playerId)) {
      return;
    }

    const playerSample = samplesByGameId.get(String(game?.id ?? ""));
    if (!playerSample) {
      return;
    }

    playersInGame
      .filter((id) => id !== playerId)
      .forEach((partnerId) => {
        const current = aggregateByPartner.get(partnerId) ?? {
          playerId: partnerId,
          playerName: playerNameMap.get(partnerId) ?? "Player",
          sampleSize: 0,
          wins: 0,
          totalPrestige: 0,
        };

        current.sampleSize += 1;
        current.wins += playerSample.winFlag;
        current.totalPrestige += playerSample.totalPrestige;

        aggregateByPartner.set(partnerId, current);
      });
  });

  const ranked = Array.from(aggregateByPartner.values())
    .filter((entry) => entry.sampleSize >= MIN_SHARED_GAMES)
    .sort((left, right) => {
      const leftWinRate = left.wins / left.sampleSize;
      const rightWinRate = right.wins / right.sampleSize;

      if (rightWinRate !== leftWinRate) {
        return rightWinRate - leftWinRate;
      }

      const leftAvgPrestige = left.totalPrestige / left.sampleSize;
      const rightAvgPrestige = right.totalPrestige / right.sampleSize;

      if (rightAvgPrestige !== leftAvgPrestige) {
        return rightAvgPrestige - leftAvgPrestige;
      }

      if (right.sampleSize !== left.sampleSize) {
        return right.sampleSize - left.sampleSize;
      }

      return left.playerName.localeCompare(right.playerName);
    });

  const best = ranked[0];
  if (!best) {
    return null;
  }

  const winRate = best.wins / best.sampleSize;
  const avgPrestige = best.totalPrestige / best.sampleSize;

  return {
    playerId: best.playerId,
    playerName: best.playerName,
    winRate,
    avgPrestige,
    sampleSize: best.sampleSize,
    winRateLabel: formatPercent(winRate),
    avgPrestigeLabel: formatNumber(avgPrestige),
    sampleSizeLabel: `${best.sampleSize} games`,
  } satisfies MoonrakersPartnerSummary;
}

function buildMostCommonAssistTarget(
  playerId: string,
  playerNameMap: Map<string, string>,
  games: Game[]
) {
  const aggregateByTarget = new Map<string, AssistTargetAggregate>();
  const sharedGamesByTarget = new Map<string, Set<string>>();

  games.forEach((game) => {
    const gameId = String(game?.id ?? "");
    const rounds = getRounds(game);
    const playersInGame = new Set(
      (Array.isArray(game?.players) ? game.players : [])
        .map((entry: any) => String(entry?.id))
        .filter(Boolean)
    );

    rounds.forEach((round) => {
      if (String(round?.playerId) !== playerId) {
        return;
      }

      const recipients =
        round?.assistRecipients &&
        typeof round.assistRecipients === "object" &&
        !Array.isArray(round.assistRecipients)
          ? round.assistRecipients
          : {};

      Object.entries(recipients).forEach(([targetId, rawValue]) => {
        const assistsSent = Number(rawValue) || 0;
        if (!targetId || assistsSent <= 0) {
          return;
        }

        const current = aggregateByTarget.get(targetId) ?? {
          playerId: targetId,
          playerName: playerNameMap.get(targetId) ?? "Player",
          assistsSent: 0,
          sampleSize: 0,
        };

        current.assistsSent += assistsSent;
        aggregateByTarget.set(targetId, current);

        const sharedGames = sharedGamesByTarget.get(targetId) ?? new Set<string>();
        sharedGames.add(gameId);
        sharedGamesByTarget.set(targetId, sharedGames);
      });
    });

    playersInGame.delete(playerId);
    playersInGame.forEach((targetId) => {
      if (!sharedGamesByTarget.has(targetId)) {
        sharedGamesByTarget.set(targetId, new Set<string>());
      }
    });
  });

  const ranked = Array.from(aggregateByTarget.values())
    .map((entry) => ({
      ...entry,
      sampleSize: sharedGamesByTarget.get(entry.playerId)?.size ?? 0,
    }))
    .filter((entry) => entry.sampleSize >= MIN_SHARED_GAMES)
    .sort((left, right) => {
      if (right.assistsSent !== left.assistsSent) {
        return right.assistsSent - left.assistsSent;
      }

      if (right.sampleSize !== left.sampleSize) {
        return right.sampleSize - left.sampleSize;
      }

      return left.playerName.localeCompare(right.playerName);
    });

  const best = ranked[0];
  if (!best) {
    return null;
  }

  return {
    playerId: best.playerId,
    playerName: best.playerName,
    assistsSent: best.assistsSent,
    sampleSize: best.sampleSize,
    assistsSentLabel: `${best.assistsSent}`,
    sampleSizeLabel: `${best.sampleSize} games`,
  } satisfies MoonrakersAssistTargetSummary;
}

function buildSupportProfileSummary({
  playerId,
  players,
  games,
  playerSamples,
}: {
  playerId: string;
  players: Array<Pick<Player, "id" | "name">>;
  games: Game[];
  playerSamples: PlaystyleSample[];
}): MoonrakersSupportProfileSummary {
  const playerNameMap = getPlayerNameMap(players);
  const gameIds = new Set(playerSamples.map((sample) => sample.gameId));
  const relevantGames = games.filter((game) => gameIds.has(String(game?.id ?? "")));
  const samplesByGameId = new Map(
    playerSamples.map((sample) => [sample.gameId, sample] as const)
  );

  return {
    assistsGivenPerGameLabel: formatNumber(
      average(playerSamples.map((sample) => sample.assistsGiven))
    ),
    assistsReceivedPerGameLabel: formatNumber(
      average(playerSamples.map((sample) => sample.assistsReceived))
    ),
    bestSupportPartner: buildBestSupportPartner(
      playerId,
      playerNameMap,
      relevantGames,
      samplesByGameId
    ),
    mostCommonAssistTarget: buildMostCommonAssistTarget(
      playerId,
      playerNameMap,
      relevantGames
    ),
    supportStyle: getSupportStyle(playerSamples),
  };
}

function buildAssistContextSummary({
  playerId,
  games,
  playerSamples,
}: {
  playerId: string;
  games: Game[];
  playerSamples: PlaystyleSample[];
}): MoonrakersAssistContextSummary {
  const gameIds = new Set(playerSamples.map((sample) => sample.gameId));
  const relevantGames = games.filter((game) => gameIds.has(String(game?.id ?? "")));
  const playerEvents = buildAssistContextEvents(relevantGames).filter(
    (event) => event.assisterId === playerId,
  );
  const playerGameSamples = buildAssistContextGameSamples(relevantGames).filter(
    (sample) => sample.playerId === playerId,
  );
  const trackedAssistGames = playerGameSamples.filter(
    (sample) => sample.hasTrackedAssistContext,
  );
  const timedAssistCount = playerEvents.length;
  const totalAssistCount = playerGameSamples.reduce(
    (sum, sample) => sum + sample.assistCount,
    0,
  );
  const totalAssistPrestigeGained = playerGameSamples.reduce(
    (sum, sample) => sum + sample.totalAssistPrestigeGained,
    0,
  );
  const assistImportHealth = getAssistImportHealthSummary({
    timedAssistCount,
    totalAssistCount,
    trackedGameCount: trackedAssistGames.length,
  });

  return {
    assistGapToTargetLabel: timedAssistCount
      ? formatNumber(average(playerEvents.map((event) => event.gapToTarget)))
      : null,
    assistGapToLeaderLabel: timedAssistCount
      ? formatNumber(average(playerEvents.map((event) => event.gapToLeader)))
      : null,
    assistsAtSixPlusLabel: timedAssistCount
      ? formatCountShareLabel(
          trackedAssistGames.reduce(
            (sum, sample) => sum + sample.assistsAtSixPlus,
            0,
          ),
          timedAssistCount,
        )
      : null,
    assistsOverFiveBehindLeaderLabel: timedAssistCount
      ? formatCountShareLabel(
          trackedAssistGames.reduce(
            (sum, sample) => sum + sample.assistsWhileFiveBehindLeader,
            0,
          ),
          timedAssistCount,
        )
      : null,
    assistPrestigeGainedLabel: totalAssistCount > 0 || totalAssistPrestigeGained > 0
      ? formatNumber(totalAssistPrestigeGained)
      : null,
    assistPrestigePerAssistLabel: totalAssistCount > 0
      ? formatNumber(totalAssistPrestigeGained / totalAssistCount)
      : null,
    importHealthLabel: assistImportHealth.importHealthLabel,
    importHealthTone: assistImportHealth.importHealthTone,
    importHealthSubLabel: assistImportHealth.importHealthSubLabel,
    assistEventsLabel: formatCountLabel(totalAssistCount, "assist"),
    timedAssistEventsLabel: formatCountLabel(timedAssistCount, "timed assist"),
    trackedGamesLabel: formatCountLabel(trackedAssistGames.length, "tracked game"),
  };
}

export function buildMoonrakersIntelProfile({
  playerId,
  players,
  games,
  samples,
}: BuildMoonrakersIntelProfileInput): MoonrakersIntelProfile {
  const normalizedPlayerId = String(playerId);
  const playerSamples = samples.filter(
    (sample) => String(sample.playerId) === normalizedPlayerId
  );

  if (playerSamples.length < MIN_PROFILE_GAMES) {
    return buildEmptyProfile();
  }

  const candidates = buildConditionCandidates(playerSamples);
  const bestCandidate = [...candidates].sort(compareBestConditions)[0] ?? null;
  const worstCandidate = [...candidates].sort(compareWorstConditions)[0] ?? null;

  return {
    hasData: true,
    playstyle: buildPlaystyleSummary(playerSamples),
    bestCondition: bestCandidate
      ? formatConditionSummary("Best", bestCandidate)
      : null,
    worstCondition: worstCandidate
      ? formatConditionSummary("Worst", worstCandidate)
      : null,
    baseDiscipline: buildBaseDisciplineSummary(playerSamples),
    objectiveProfile: buildObjectiveProfileSummary(playerSamples),
    supportProfile: buildSupportProfileSummary({
      playerId: normalizedPlayerId,
      players,
      games,
      playerSamples,
    }),
    assistContext: buildAssistContextSummary({
      playerId: normalizedPlayerId,
      games,
      playerSamples,
    }),
  };
}
