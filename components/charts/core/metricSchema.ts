export type MetricMode = 'raw' | 'perTurn' | 'efficiency';

export type MetricKey =
  | 'score'
  | 'totalPrestige'
  | 'directPrestige'
  | 'assistPrestigeReceived'
  | 'assists'
  | 'contracts'
  | 'failures'
  | 'turnsAtBase'
  | 'turns'
  | 'allContractsEfficiency'
  | 'assistEfficiency'
  | 'directEfficiency'
  | 'contractSuccessRate';

export type PlayerMetrics = Record<MetricKey, number>;

export type ChartPlayerRow = {
  id: string;
  label: string;
  color?: string;
  metrics: PlayerMetrics;
};

export type SourcePlayerLike = {
  id?: string;
  name?: string;
  initials?: string;
  color?: string;
  score?: number;
  totalPrestige?: number;
  prestige?: number;
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

export type MetricDefinition = {
  key: MetricKey;
  label: string;
  shortLabel: string;
  description: string;
  higherIsBetter: boolean;
  mode: MetricMode;
  decimals?: number;
  kind?: 'number' | 'percent';
};

export const RAW_METRICS: MetricKey[] = [
  'score',
  'totalPrestige',
  'directPrestige',
  'assistPrestigeReceived',
  'assists',
  'contracts',
  'failures',
  'turnsAtBase',
];

export const PER_TURN_METRICS: MetricKey[] = [
  'score',
  'totalPrestige',
  'directPrestige',
  'assistPrestigeReceived',
  'assists',
  'contracts',
  'failures',
  'turnsAtBase',
];

export const EFFICIENCY_METRICS: MetricKey[] = [
  'allContractsEfficiency',
  'assistEfficiency',
  'directEfficiency',
  'contractSuccessRate',
];

export const METRIC_DEFINITIONS: Record<MetricKey, MetricDefinition> = {
  score: {
    key: 'score',
    label: 'Score',
    shortLabel: 'S',
    description: 'Overall score total for the player.',
    higherIsBetter: true,
    mode: 'raw',
    decimals: 0,
  },
  totalPrestige: {
    key: 'totalPrestige',
    label: 'Total Prestige',
    shortLabel: 'TP',
    description: 'Direct prestige plus prestige received through assists.',
    higherIsBetter: true,
    mode: 'raw',
    decimals: 0,
  },
  directPrestige: {
    key: 'directPrestige',
    label: 'Direct Prestige',
    shortLabel: 'DP',
    description: 'Prestige earned directly from the player’s own successful contracts or objectives.',
    higherIsBetter: true,
    mode: 'raw',
    decimals: 0,
  },
  assistPrestigeReceived: {
    key: 'assistPrestigeReceived',
    label: 'Assist Prestige',
    shortLabel: 'AP',
    description: 'Prestige received from helping other players.',
    higherIsBetter: true,
    mode: 'raw',
    decimals: 0,
  },
  assists: {
    key: 'assists',
    label: 'Assists',
    shortLabel: 'A',
    description: 'Number of assists contributed to other players.',
    higherIsBetter: true,
    mode: 'raw',
    decimals: 0,
  },
  contracts: {
    key: 'contracts',
    label: 'Contracts',
    shortLabel: 'C',
    description: 'Number of successful contracts completed.',
    higherIsBetter: true,
    mode: 'raw',
    decimals: 0,
  },
  failures: {
    key: 'failures',
    label: 'Failures',
    shortLabel: 'F',
    description: 'Number of failed contract attempts.',
    higherIsBetter: false,
    mode: 'raw',
    decimals: 0,
  },
  turnsAtBase: {
    key: 'turnsAtBase',
    label: 'Turns At Base',
    shortLabel: 'Base',
    description: 'Turns spent staying at base instead of contracting or assisting.',
    higherIsBetter: false,
    mode: 'raw',
    decimals: 0,
  },
  turns: {
    key: 'turns',
    label: 'Turns',
    shortLabel: 'T',
    description: 'Total turns used for normalization and per-turn calculations.',
    higherIsBetter: true,
    mode: 'raw',
    decimals: 0,
  },
  allContractsEfficiency: {
    key: 'allContractsEfficiency',
    label: 'All Contracts Efficiency',
    shortLabel: 'ACE',
    description: 'Direct prestige plus assisted prestige divided by contracts plus assists.',
    higherIsBetter: true,
    mode: 'efficiency',
    decimals: 2,
  },
  assistEfficiency: {
    key: 'assistEfficiency',
    label: 'Assist Efficiency',
    shortLabel: 'AE',
    description: 'Assist prestige divided by assists.',
    higherIsBetter: true,
    mode: 'efficiency',
    decimals: 2,
  },
  directEfficiency: {
    key: 'directEfficiency',
    label: 'Direct Efficiency',
    shortLabel: 'DE',
    description: 'Direct prestige divided by contracts.',
    higherIsBetter: true,
    mode: 'efficiency',
    decimals: 2,
  },
  contractSuccessRate: {
    key: 'contractSuccessRate',
    label: 'Contract Success Rate',
    shortLabel: 'CSR',
    description: 'Successful contracts divided by successful plus failed contract attempts.',
    higherIsBetter: true,
    mode: 'efficiency',
    decimals: 1,
    kind: 'percent',
  },
};

export const EMPTY_PLAYER_METRICS: PlayerMetrics = {
  score: 0,
  totalPrestige: 0,
  directPrestige: 0,
  assistPrestigeReceived: 0,
  assists: 0,
  contracts: 0,
  failures: 0,
  turnsAtBase: 0,
  turns: 0,
  allContractsEfficiency: 0,
  assistEfficiency: 0,
  directEfficiency: 0,
  contractSuccessRate: 0,
};

export function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveTurns(player: SourcePlayerLike): number {
  const explicitTurns =
    safeNumber(player.turns) ||
    safeNumber(player.turnsPlayed) ||
    safeNumber(player.roundsPlayed) ||
    safeNumber(player.totalTurns);

  if (explicitTurns > 0) {
    return explicitTurns;
  }

  return (
    safeNumber(player.contracts) +
    safeNumber(player.assists) +
    safeNumber(player.failures) +
    safeNumber(player.turnsAtBase)
  );
}

export function buildPlayerMetrics(player: SourcePlayerLike): PlayerMetrics {
  const metricsFromPlayer = player?.metrics;

  if (metricsFromPlayer && typeof metricsFromPlayer === 'object') {
    return {
      score: safeNumber(metricsFromPlayer.score, safeNumber(player.score)),
      totalPrestige: safeNumber(
        metricsFromPlayer.totalPrestige,
        safeNumber(player.totalPrestige, safeNumber(player.prestige))
      ),
      directPrestige: safeNumber(
        metricsFromPlayer.directPrestige,
        safeNumber(player.directPrestige)
      ),
      assistPrestigeReceived: safeNumber(
        metricsFromPlayer.assistPrestigeReceived,
        safeNumber(player.assistPrestigeReceived)
      ),
      assists: safeNumber(metricsFromPlayer.assists, safeNumber(player.assists)),
      contracts: safeNumber(metricsFromPlayer.contracts, safeNumber(player.contracts)),
      failures: safeNumber(metricsFromPlayer.failures, safeNumber(player.failures)),
      turnsAtBase: safeNumber(
        metricsFromPlayer.turnsAtBase,
        safeNumber(player.turnsAtBase)
      ),
      turns: safeNumber(metricsFromPlayer.turns, resolveTurns(player)),
      allContractsEfficiency: safeNumber(metricsFromPlayer.allContractsEfficiency),
      assistEfficiency: safeNumber(metricsFromPlayer.assistEfficiency),
      directEfficiency: safeNumber(metricsFromPlayer.directEfficiency),
      contractSuccessRate: safeNumber(metricsFromPlayer.contractSuccessRate),
    };
  }

  const contracts = safeNumber(player.contracts);
  const assists = safeNumber(player.assists);
  const failures = safeNumber(player.failures);
  const turnsAtBase = safeNumber(player.turnsAtBase);
  const directPrestige = safeNumber(player.directPrestige);
  const assistPrestigeReceived = safeNumber(player.assistPrestigeReceived);
  const totalPrestige =
    safeNumber(player.totalPrestige, safeNumber(player.prestige)) ||
    safeNumber(player.prestige) ||
    directPrestige + assistPrestigeReceived;
  const turns = Math.max(0, resolveTurns(player));
  const attempts = contracts + failures;
  const allContractsDenominator = contracts + assists;

  return {
    ...EMPTY_PLAYER_METRICS,
    score: safeNumber(player.score, totalPrestige),
    totalPrestige,
    directPrestige,
    assistPrestigeReceived,
    assists,
    contracts,
    failures,
    turnsAtBase,
    turns,
    allContractsEfficiency:
      allContractsDenominator > 0
        ? (directPrestige + assistPrestigeReceived) / allContractsDenominator
        : 0,
    assistEfficiency: assists > 0 ? assistPrestigeReceived / assists : 0,
    directEfficiency: contracts > 0 ? directPrestige / contracts : 0,
    contractSuccessRate: attempts > 0 ? contracts / attempts : 0,
  };
}

export function normalizePlayerLike(
  player: SourcePlayerLike
): SourcePlayerLike & { metrics: PlayerMetrics } {
  return {
    ...player,
    id: String(player.id ?? player.name ?? player.initials ?? Math.random()),
    name: String(player.name ?? player.initials ?? 'Unknown Player'),
    color: typeof player.color === 'string' ? player.color : undefined,
    metrics: buildPlayerMetrics(player),
  };
}

export function getMetricsForMode(mode: MetricMode): MetricKey[] {
  if (mode === 'perTurn') {
    return PER_TURN_METRICS;
  }
  if (mode === 'efficiency') {
    return EFFICIENCY_METRICS;
  }
  return RAW_METRICS;
}