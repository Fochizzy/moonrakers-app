type Round = {
  id?: string;
  playerId: string;
  prestige?: number;
  contracts?: number;
  failures?: number;
  assistRecipients?: Record<string, number>;
  assistPrestigeRecipients?: Record<string, number>;
  createdAt?: number;
};

export type GameTimelinePoint = {
  round: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  totalPrestige: number;
  prestige: number;
  score: number;
  contracts: number;
  assists: number;
  failures: number;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getAssistCountForPlayer(round: Round, playerId: string): number {
  const raw = round.assistRecipients?.[playerId];
  return raw > 0 ? 1 : 0;
}

function getAssistPrestigeForPlayer(round: Round, playerId: string): number {
  return toNumber(round.assistPrestigeRecipients?.[playerId]);
}

function getRoundScoreDelta(round: Round, playerId: string): number {
  const isActor = round.playerId === playerId;

  const directPrestige = isActor ? toNumber(round.prestige) : 0;
  const assistPrestige = getAssistPrestigeForPlayer(round, playerId);
  const contracts = isActor ? Math.max(0, toNumber(round.contracts)) : 0;
  const failures = isActor ? Math.max(0, toNumber(round.failures)) : 0;
  const assists = getAssistCountForPlayer(round, playerId);

  return directPrestige + assistPrestige + contracts * 5 + assists * 3 - failures * 4;
}

export function buildGameTimeline(
  rounds: Round[] = [],
  playerId: string
): GameTimelinePoint[] {
  if (!playerId) return [];

  let directPrestige = 0;
  let assistPrestigeReceived = 0;
  let contracts = 0;
  let assists = 0;
  let failures = 0;
  let score = 0;

  const timeline: GameTimelinePoint[] = [];

  for (let index = 0; index < rounds.length; index += 1) {
    const round = rounds[index];

    if (!round || typeof round.playerId !== 'string') {
      continue;
    }

    if (round.playerId === playerId) {
      directPrestige += toNumber(round.prestige);
      contracts += Math.max(0, toNumber(round.contracts));
      failures += Math.max(0, toNumber(round.failures));
    }

    assists += getAssistCountForPlayer(round, playerId);
    assistPrestigeReceived += getAssistPrestigeForPlayer(round, playerId);
    score += getRoundScoreDelta(round, playerId);

    const totalPrestige = directPrestige + assistPrestigeReceived;

    timeline.push({
      round: index + 1,
      directPrestige,
      assistPrestigeReceived,
      totalPrestige,
      prestige: totalPrestige,
      score,
      contracts,
      assists,
      failures,
    });
  }

  return timeline;
}
