export type MetricKey =
  | 'score'
  | 'totalPrestige'
  | 'prestige'
  | 'directPrestige'
  | 'assistPrestigeReceived'
  | 'objectivePrestige'
  | 'assists'
  | 'contracts'
  | 'failures'
  | 'turnsAtBase'
  | 'turns'
  | 'turnsPlayed'
  | 'roundsPlayed'
  | 'totalTurns'
  | 'allContractsEfficiency'
  | 'assistEfficiency'
  | 'directEfficiency'
  | 'contractSuccessRate';

export type SourcePlayerLike = {
  id?: string;
  name?: string;
  color?: string;
  initials?: string;
  score?: number;
  totalPrestige?: number;
  prestige?: number;
  objectivePrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assists?: number;
  contracts?: number;
  failures?: number;
  turnsAtBase?: number;
  turns?: number;
  turnsPlayed?: number;
  roundsPlayed?: number;
  totalTurns?: number;
  metrics?: Partial<Record<MetricKey, number>>;
  [key: string]: unknown;
};

export type PlayerMetrics = Record<MetricKey, number>;

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickTurns(player: SourcePlayerLike): number {
  return Math.max(
    0,
    toNumber(
      player.turns ??
        player.turnsPlayed ??
        player.totalTurns ??
        player.roundsPlayed,
      0
    )
  );
}

export function buildPlayerMetrics(player: SourcePlayerLike): PlayerMetrics {
  const score = toNumber(player.score);
  const directPrestige = toNumber(player.directPrestige);
  const assistPrestigeReceived = toNumber(player.assistPrestigeReceived);
  const objectivePrestige = toNumber(player.objectivePrestige);
  const prestige = toNumber(
    player.totalPrestige ??
      player.prestige ??
      directPrestige + assistPrestigeReceived + objectivePrestige
  );
  const totalPrestige = prestige;

  const assists = toNumber(player.assists);
  const contracts = toNumber(player.contracts);
  const failures = toNumber(player.failures);
  const turnsAtBase = Math.max(0, toNumber(player.turnsAtBase));
  const turns = pickTurns(player);

  const allContractsEfficiency =
    turns > 0 ? (contracts / turns) * 100 : 0;

  const assistEfficiency =
    turns > 0 ? (assistPrestigeReceived / turns) * 100 : 0;

  const directEfficiency =
    turns > 0 ? (directPrestige / turns) * 100 : 0;

  const contractSuccessRate =
    contracts + failures > 0 ? (contracts / (contracts + failures)) * 100 : 0;

  return {
    score,
    totalPrestige,
    prestige,
    directPrestige,
    assistPrestigeReceived,
    objectivePrestige,
    assists,
    contracts,
    failures,
    turnsAtBase,
    turns,
    turnsPlayed: toNumber(player.turnsPlayed),
    roundsPlayed: toNumber(player.roundsPlayed),
    totalTurns: toNumber(player.totalTurns),
    allContractsEfficiency,
    assistEfficiency,
    directEfficiency,
    contractSuccessRate,
  };
}