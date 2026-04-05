import {
  getObjectiveCount,
  getObjectivePrestige,
  getTotalPrestige,
  getWinnerId,
  isObjectiveTrackedGame,
} from './metricsEngine';

type PlayerLookup = {
  id: string;
  name: string;
};

type StoredTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeBySource?: Record<string, number>;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
  objectiveCount?: number;
  objectivePrestige?: number;
};

type StoredGame = {
  id?: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  objectiveStatsEligible?: boolean;
  totals?: Record<string, StoredTotals>;
};

type Relationships = Record<string, Record<string, number>>;

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = average(values);
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function buildPlayerInsights(
  games: StoredGame[],
  playerId: string,
  players: PlayerLookup[],
  relationships: Relationships = {}
): string[] {
  let gamesPlayed = 0;
  let wins = 0;

  let totalPrestige = 0;
  let totalDirectPrestige = 0;
  let totalAssistPrestigeReceived = 0;
  let totalScore = 0;
  let totalAssists = 0;
  let totalFailures = 0;
  let totalContracts = 0;

  let totalGamePrestigePool = 0;
  let prestigeInWins = 0;
  let winGames = 0;

  let totalObjectiveCount = 0;
  let totalObjectivePrestige = 0;
  let objectiveEligibleGames = 0;
  let objectiveWins = 0;

  const prestigeHistory: number[] = [];
  const recentPrestige: number[] = [];
  const synergyMap: Record<string, number> = {};

  for (const game of games) {
    const totals = game.totals?.[playerId];
    if (!totals) continue;

    gamesPlayed += 1;

    const prestige = getTotalPrestige(totals);
    const directPrestige = toNumber(totals.directPrestige);
    const assistPrestigeReceived = toNumber(totals.assistPrestigeReceived);
    const score = toNumber(totals.score);
    const assists = toNumber(totals.assists);
    const failures = toNumber(totals.failures);
    const contracts = toNumber(totals.contracts);

    totalPrestige += prestige;
    totalDirectPrestige += directPrestige;
    totalAssistPrestigeReceived += assistPrestigeReceived;
    totalScore += score;
    totalAssists += assists;
    totalFailures += failures;
    totalContracts += contracts;

    prestigeHistory.push(prestige);
    recentPrestige.push(prestige);
    if (recentPrestige.length > 5) {
      recentPrestige.shift();
    }

    const winnerId = getWinnerId(game);

    if (winnerId === playerId) {
      wins += 1;
      prestigeInWins += prestige;
      winGames += 1;
    }

    if (isObjectiveTrackedGame(game)) {
      totalObjectiveCount += getObjectiveCount(totals);
      totalObjectivePrestige += getObjectivePrestige(totals);
      objectiveEligibleGames += 1;

      if (winnerId === playerId) {
        objectiveWins += 1;
      }
    }

    const gamePool = Object.values(game.totals ?? {}).reduce((sum, playerTotals) => {
      return sum + getTotalPrestige(playerTotals ?? {});
    }, 0);

    totalGamePrestigePool += gamePool;

    const assistSources = totals.assistPrestigeBySource ?? {};
    for (const [sourcePlayerId, amount] of Object.entries(assistSources)) {
      synergyMap[sourcePlayerId] = (synergyMap[sourcePlayerId] ?? 0) + toNumber(amount);
    }
  }

  if (gamesPlayed === 0) {
    return ['No games played yet.'];
  }

  const avgPrestige = totalPrestige / gamesPlayed;
  const avgScore = totalScore / gamesPlayed;
  const winRate = wins / gamesPlayed;

  const assistShare = totalPrestige > 0 ? totalAssistPrestigeReceived / totalPrestige : 0;
  const assistDependency =
    totalContracts + totalAssists > 0
      ? totalAssists / (totalContracts + totalAssists)
      : 0;

  const allEfficiency =
    totalContracts + totalAssists > 0
      ? totalPrestige / (totalContracts + totalAssists)
      : 0;

  const assistEfficiency =
    totalAssists > 0
      ? totalAssistPrestigeReceived / totalAssists
      : 0;

  const directEfficiency =
    totalContracts > 0
      ? totalDirectPrestige / totalContracts
      : 0;

  const failureRate = totalContracts > 0 ? totalFailures / totalContracts : 0;
  const volatility = standardDeviation(prestigeHistory);

  const consistencyScore =
    avgPrestige > 0 ? Math.max(0, 1 - volatility / Math.max(avgPrestige, 1)) : 0;

  const recentAverage = average(recentPrestige);
  const longTermAverage = average(prestigeHistory);
  const momentum = recentAverage - longTermAverage;

  const impactScore =
    totalGamePrestigePool > 0 ? totalPrestige / totalGamePrestigePool : 0;

  const avgPrestigeInWins = winGames > 0 ? prestigeInWins / winGames : 0;
  const winImpact = avgPrestige > 0 ? avgPrestigeInWins / avgPrestige : 0;

  const bestTeammateId =
    Object.entries(synergyMap).sort((a, b) => b[1] - a[1])[0]?.[0];

  const avgObjectivesPerEligibleGame =
    objectiveEligibleGames > 0 ? totalObjectiveCount / objectiveEligibleGames : 0;
  const objectiveWinRate =
    objectiveEligibleGames > 0 ? objectiveWins / objectiveEligibleGames : 0;
  const objectiveShareOfPrestige =
    totalPrestige > 0 ? totalObjectivePrestige / totalPrestige : 0;

  let playstyle = 'Balanced';
  if (assistShare >= 0.5) {
    playstyle = 'Support';
  } else if (directEfficiency >= 2 && avgPrestige > avgScore) {
    playstyle = 'Strategist';
  } else if (avgScore > avgPrestige * 1.5) {
    playstyle = 'Aggressive';
  } else if (avgPrestige > avgScore * 1.5) {
    playstyle = 'Builder';
  }

  const player = players.find((p) => p.id === playerId);
  const playerName = player?.name ?? 'This player';

  const insights: string[] = [];

  insights.push(
    `${playerName} generated ${totalPrestige.toFixed(0)} total prestige across ${gamesPlayed} game${gamesPlayed === 1 ? '' : 's'}.`
  );

  insights.push(
    `Win rate: ${formatPercent(winRate)} with average ${avgPrestige.toFixed(1)} prestige per game.`
  );

  if (totalDirectPrestige > 0 || totalAssistPrestigeReceived > 0 || totalObjectivePrestige > 0) {
    insights.push(
      `Prestige mix: ${totalDirectPrestige.toFixed(0)} direct, ${totalAssistPrestigeReceived.toFixed(0)} from assists, and ${totalObjectivePrestige.toFixed(0)} from objectives.`
    );
  }

  if (objectiveEligibleGames > 0) {
    insights.push(
      `Objective-only stats use post-patch tracked games only. Since then, ${playerName} has ${totalObjectiveCount} objective${totalObjectiveCount === 1 ? '' : 's'} across ${objectiveEligibleGames} tracked game${objectiveEligibleGames === 1 ? '' : 's'} (${avgObjectivesPerEligibleGame.toFixed(2)} per tracked game).`
    );

    insights.push(
      `Objectives account for ${formatPercent(objectiveShareOfPrestige)} of total prestige, and win rate in objective-tracked games is ${formatPercent(objectiveWinRate)}.`
    );
  } else {
    insights.push(
      'Objective-specific insights are not shown yet because this player has no post-patch games with objective tracking enabled.'
    );
  }

  if (assistShare >= 0.5) {
    insights.push('Generates a majority of prestige through assist support.');
  } else if (assistShare >= 0.3) {
    insights.push('Gets a meaningful portion of prestige from assists.');
  } else {
    insights.push('Primarily generates prestige independently.');
  }

  if (assistDependency >= 0.5) {
    insights.push('Relies heavily on assists as part of overall involvement.');
  } else if (assistDependency <= 0.2 && totalContracts > 0) {
    insights.push('Creates value mostly through direct contracts.');
  }

  if (assistEfficiency > directEfficiency + 0.15) {
    insights.push('Converts assist opportunities into prestige more efficiently than direct contracts.');
  } else if (directEfficiency > assistEfficiency + 0.15) {
    insights.push('Converts direct contracts into prestige more efficiently than assist opportunities.');
  } else if (totalContracts + totalAssists > 0) {
    insights.push('Direct and assist efficiency are fairly balanced.');
  }

  if (allEfficiency > 0) {
    insights.push(`All Eff: ${allEfficiency.toFixed(2)}. Direct Eff: ${directEfficiency.toFixed(2)}. Assist Eff: ${assistEfficiency.toFixed(2)}.`);
  }

  if (momentum > 0.5) {
    insights.push('Recent prestige output is trending upward.');
  } else if (momentum < -0.5) {
    insights.push('Recent prestige output is below long-term average.');
  }

  if (failureRate >= 0.3) {
    insights.push('Plays a high-risk style with an elevated failure rate.');
  } else if (failureRate <= 0.1 && (totalContracts > 0 || totalAssists > 0)) {
    insights.push('Maintains a low failure rate while contributing consistently.');
  }

  if (consistencyScore >= 0.6) {
    insights.push('Produces stable prestige results from game to game.');
  } else if (volatility >= 4) {
    insights.push('Shows large swings in prestige output between games.');
  }

  if (impactScore >= 0.35) {
    insights.push('Commands a large share of total game prestige.');
  } else if (impactScore > 0 && impactScore <= 0.2) {
    insights.push('Usually contributes a smaller slice of the total prestige pool.');
  }

  if (winImpact >= 1.15) {
    insights.push('Prestige output rises noticeably in wins.');
  } else if (winImpact > 0 && winImpact <= 0.9) {
    insights.push('Winning is not strongly tied to higher personal prestige totals.');
  }

  if (bestTeammateId) {
    const teammate = players.find((p) => p.id === bestTeammateId);
    if (teammate) {
      insights.push(`Strongest assist synergy appears to be with ${teammate.name}.`);
    }
  }

  const directRelationshipCount = Object.keys(relationships[playerId] ?? {}).length;
  if (directRelationshipCount > 0) {
    insights.push(
      `Recorded assist relationships with ${directRelationshipCount} teammate${directRelationshipCount === 1 ? '' : 's'}.`
    );
  }

  insights.push(`Current playstyle classification: ${playstyle}.`);

  return insights;
}
