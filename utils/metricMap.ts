export type MetricScope =
  | 'overview'
  | 'player'
  | 'globalCorrelation'
  | 'personalCorrelation'
  | 'gameCorrelation'
  | 'gameInsight';

export type MetricFormat =
  | 'number'
  | 'decimal'
  | 'percent'
  | 'signed'
  | 'elo'
  | 'text';

export type MetricDirection = 'higher' | 'lower' | 'neutral';

export type MetricCategory =
  | 'Core'
  | 'Efficiency'
  | 'Support'
  | 'Execution'
  | 'Pressure'
  | 'Outcome'
  | 'Position'
  | 'Elo'
  | 'Tempo'
  | 'Conversion'
  | 'Style'
  | 'Projection'
  | 'Derived'
  | 'Context';

export type MetricInterpretation = {
  positive: string;
  negative: string;
  neutral: string;
};

export type MetricDefinition = {
  key: string;
  label: string;
  category: MetricCategory;
  scope: MetricScope[];
  format: MetricFormat;
  description: string;
  formula: string;
  meaning: string;
  direction?: MetricDirection;
  topMetric?: boolean;
  decimals?: number;
  interpretation?: MetricInterpretation;
};

function metric(def: MetricDefinition): MetricDefinition {
  return def;
}

export const METRICS: MetricDefinition[] = [
  metric({
    key: 'elo',
    label: 'ELO',
    category: 'Elo',
    scope: ['overview', 'player'],
    format: 'elo',
    description: 'Current rating-based strength estimate.',
    formula: 'currentElo',
    meaning: 'Higher means the player is rated stronger overall.',
    direction: 'higher',
    topMetric: true,
  }),
  metric({
    key: 'eloDelta',
    label: 'ELO Delta',
    category: 'Elo',
    scope: ['overview', 'player'],
    format: 'signed',
    description: 'Net rating movement across the tracked sample.',
    formula: 'currentElo - startingElo',
    meaning: 'Positive values mean rating growth; negative values mean decline.',
    direction: 'higher',
  }),
  metric({
    key: 'score',
    label: 'Score',
    category: 'Core',
    scope: ['overview', 'player', 'globalCorrelation', 'personalCorrelation', 'gameCorrelation', 'gameInsight'],
    format: 'number',
    description: 'Broadest tracked production metric.',
    formula: 'sum(score)',
    meaning: 'Higher is better for overall production.',
    direction: 'higher',
    topMetric: true,
  }),
  metric({
    key: 'totalPrestige',
    label: 'Total Prestige',
    category: 'Core',
    scope: ['overview', 'player', 'globalCorrelation', 'personalCorrelation', 'gameCorrelation', 'gameInsight'],
    format: 'number',
    description: 'Total prestige generated from all tracked sources.',
    formula: 'sum(totalPrestige)',
    meaning: 'Higher means more total prestige impact.',
    direction: 'higher',
    topMetric: true,
  }),
  metric({
    key: 'directPrestige',
    label: 'Direct Prestige',
    category: 'Execution',
    scope: ['player', 'globalCorrelation', 'personalCorrelation', 'gameCorrelation', 'gameInsight'],
    format: 'number',
    description: 'Prestige earned directly through personal execution.',
    formula: 'sum(directPrestige)',
    meaning: 'Higher means stronger direct output.',
    direction: 'higher',
  }),
  metric({
    key: 'assistPrestigeReceived',
    label: 'Assist Prestige Received',
    category: 'Support',
    scope: ['player', 'globalCorrelation', 'personalCorrelation', 'gameCorrelation', 'gameInsight'],
    format: 'number',
    description: 'Prestige received through support interactions.',
    formula: 'sum(assistPrestigeReceived)',
    meaning: 'Higher means the player converted more support into value.',
    direction: 'higher',
  }),
  metric({
    key: 'assistPrestigeSent',
    label: 'Assist Prestige Sent',
    category: 'Support',
    scope: ['player', 'globalCorrelation', 'personalCorrelation'],
    format: 'number',
    description: 'Prestige sent to others through support actions.',
    formula: 'sum(assistPrestigeSent)',
    meaning: 'Higher means the player created more support value for others.',
    direction: 'higher',
  }),
  metric({
    key: 'assists',
    label: 'Assists',
    category: 'Support',
    scope: ['player', 'globalCorrelation', 'personalCorrelation', 'gameCorrelation', 'gameInsight'],
    format: 'number',
    description: 'Total assist actions recorded.',
    formula: 'sum(assists)',
    meaning: 'Higher means more support activity volume.',
    direction: 'higher',
  }),
  metric({
    key: 'contracts',
    label: 'Contracts',
    category: 'Execution',
    scope: ['player', 'globalCorrelation', 'personalCorrelation', 'gameCorrelation', 'gameInsight'],
    format: 'number',
    description: 'Total contract attempts or completions tracked.',
    formula: 'sum(contracts)',
    meaning: 'Higher usually means more initiative or workload.',
    direction: 'higher',
  }),
  metric({
    key: 'failures',
    label: 'Failures',
    category: 'Execution',
    scope: ['player', 'globalCorrelation', 'personalCorrelation', 'gameCorrelation', 'gameInsight'],
    format: 'number',
    description: 'Total failed attempts.',
    formula: 'sum(failures)',
    meaning: 'Lower is usually better unless paired with very high output.',
    direction: 'lower',
  }),
  metric({
    key: 'wins',
    label: 'Wins',
    category: 'Outcome',
    scope: ['overview', 'player', 'globalCorrelation', 'personalCorrelation'],
    format: 'number',
    description: 'Total wins in the sample.',
    formula: 'count(wins)',
    meaning: 'Higher is better.',
    direction: 'higher',
    topMetric: true,
  }),
  metric({
    key: 'games',
    label: 'Games Played',
    category: 'Outcome',
    scope: ['overview', 'player'],
    format: 'number',
    description: 'Total games in the sample.',
    formula: 'count(games)',
    meaning: 'Use this for sample-size context.',
    direction: 'neutral',
  }),
  metric({
    key: 'winRate',
    label: 'Win Rate',
    category: 'Outcome',
    scope: ['overview', 'player', 'globalCorrelation', 'personalCorrelation'],
    format: 'percent',
    description: 'Wins divided by games played.',
    formula: 'wins / games',
    meaning: 'Higher means the player converts games into wins more often.',
    direction: 'higher',
    topMetric: true,
  }),
  metric({
    key: 'avgPrestigePerGame',
    label: 'Prestige / Game',
    category: 'Core',
    scope: ['player', 'globalCorrelation', 'personalCorrelation'],
    format: 'decimal',
    description: 'Average prestige generated per game.',
    formula: 'totalPrestige / games',
    meaning: 'Higher means more consistent prestige output.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'avgScorePerGame',
    label: 'Score / Game',
    category: 'Core',
    scope: ['player', 'globalCorrelation', 'personalCorrelation'],
    format: 'decimal',
    description: 'Average score produced per game.',
    formula: 'score / games',
    meaning: 'Higher means more per-game production.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'allContractsEfficiency',
    label: 'Overall Efficiency',
    category: 'Efficiency',
    scope: ['player', 'globalCorrelation', 'personalCorrelation'],
    format: 'decimal',
    description: 'Combined prestige efficiency across direct and assisted production.',
    formula: '(directPrestige + assistPrestigeReceived) / max(1, contracts + assists)',
    meaning: 'Higher means the player gets more value from each tracked action.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'directEfficiency',
    label: 'Direct Efficiency',
    category: 'Efficiency',
    scope: ['player', 'globalCorrelation', 'personalCorrelation'],
    format: 'decimal',
    description: 'Direct prestige generated per contract.',
    formula: 'directPrestige / max(1, contracts)',
    meaning: 'Higher means stronger direct execution efficiency.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'assistEfficiency',
    label: 'Assist Efficiency',
    category: 'Efficiency',
    scope: ['player', 'globalCorrelation', 'personalCorrelation'],
    format: 'decimal',
    description: 'Assist prestige received per assist action.',
    formula: 'assistPrestigeReceived / max(1, assists)',
    meaning: 'Higher means support opportunities turn into more value.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'assistedEfficiency',
    label: 'Assisted Efficiency',
    category: 'Efficiency',
    scope: ['player'],
    format: 'decimal',
    description: 'Alias metric for support-weighted efficiency displays.',
    formula: 'assistPrestigeReceived / max(1, assists)',
    meaning: 'Higher means better supported-value conversion.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'assistShare',
    label: 'Assist Share',
    category: 'Support',
    scope: ['player'],
    format: 'percent',
    description: 'Percentage of prestige that came from assists.',
    formula: 'assistPrestigeReceived / max(1, totalPrestige)',
    meaning: 'Higher means a larger share of value came from support.',
    direction: 'neutral',
  }),
  metric({
    key: 'assistInPerGame',
    label: 'Assist In / Game',
    category: 'Support',
    scope: ['player'],
    format: 'decimal',
    description: 'Average assist prestige received per game.',
    formula: 'assistPrestigeReceived / max(1, games)',
    meaning: 'Higher means more incoming support value per game.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'contractFailureRatio',
    label: 'Contracts / Failures Ratio',
    category: 'Efficiency',
    scope: ['player'],
    format: 'decimal',
    description: 'Successful contract volume relative to failures.',
    formula: 'contracts / max(1, failures)',
    meaning: 'Higher means cleaner execution.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'failureRate',
    label: 'Failure Rate',
    category: 'Execution',
    scope: ['player', 'globalCorrelation', 'personalCorrelation'],
    format: 'percent',
    description: 'Failure rate relative to total attempts.',
    formula: 'failures / max(1, contracts + failures)',
    meaning: 'Lower is usually better.',
    direction: 'lower',
  }),
  metric({
    key: 'closeGames',
    label: 'Close Games',
    category: 'Pressure',
    scope: ['player', 'gameInsight'],
    format: 'number',
    description: 'Number of close games played.',
    formula: 'count(games with close margin)',
    meaning: 'Sample-size metric for pressure situations.',
    direction: 'neutral',
  }),
  metric({
    key: 'closeGameRate',
    label: 'Close Game Rate',
    category: 'Pressure',
    scope: ['player'],
    format: 'percent',
    description: 'Share of games that stayed close.',
    formula: 'closeGames / max(1, games)',
    meaning: 'Higher means a larger share of games were contested.',
    direction: 'neutral',
  }),
  metric({
    key: 'bestPrestigeMargin',
    label: 'Best Prestige Margin',
    category: 'Outcome',
    scope: ['player'],
    format: 'signed',
    description: 'Best winning prestige margin achieved.',
    formula: 'max(prestigeMargin)',
    meaning: 'Higher means the player has posted a stronger peak margin.',
    direction: 'higher',
  }),
  metric({
    key: 'avgPrestigeMarginPerGame',
    label: 'Average Prestige Margin / Game',
    category: 'Outcome',
    scope: ['player', 'gameInsight'],
    format: 'signed',
    description: 'Average prestige margin per game.',
    formula: 'sum(prestigeMargin) / max(1, games)',
    meaning: 'Higher means the player tends to outperform the field by more.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'avgStartSeat',
    label: 'Average Start Seat',
    category: 'Position',
    scope: ['player', 'globalCorrelation'],
    format: 'decimal',
    description: 'Average recorded starting seat.',
    formula: 'average(startSeat)',
    meaning: 'Use with seat-related win metrics to understand turn-order context.',
    direction: 'neutral',
    decimals: 2,
  }),
  metric({
    key: 'turnOrderWinCorrelation',
    label: 'Seat to Win Correlation',
    category: 'Position',
    scope: ['player', 'globalCorrelation'],
    format: 'decimal',
    description: 'Relationship between starting seat and winning.',
    formula: 'pearsonCorrelation(startSeat, wins)',
    meaning: 'Positive or negative values indicate turn-order sensitivity.',
    direction: 'neutral',
    decimals: 2,
  }),
  metric({
    key: 'recentFormDelta',
    label: 'Recent Form Delta',
    category: 'Derived',
    scope: ['overview', 'player', 'gameInsight'],
    format: 'signed',
    description: 'Recent form compared with long-run baseline.',
    formula: 'recentAvgPrestige - overallAvgPrestige',
    meaning: 'Positive values mean the player is running hotter recently.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'prestigePerTurn',
    label: 'Prestige / Turn',
    category: 'Tempo',
    scope: ['player', 'globalCorrelation', 'personalCorrelation'],
    format: 'decimal',
    description: 'How quickly a player turns actions into prestige.',
    formula: 'totalPrestige / max(1, estimatedTurns)',
    meaning: 'Higher means faster value generation.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'objectivesPerGame',
    label: 'Objectives / Game',
    category: 'Core',
    scope: ['player', 'globalCorrelation', 'personalCorrelation'],
    format: 'decimal',
    description: 'Average objective output per game.',
    formula: 'contracts / max(1, games)',
    meaning: 'Higher means more objective pressure each game.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'leadConversion',
    label: 'Lead Conversion',
    category: 'Conversion',
    scope: ['player', 'globalCorrelation'],
    format: 'percent',
    description: 'How often early leads become wins.',
    formula: 'winsWhenLeading / max(1, gamesLed)',
    meaning: 'Higher means the player closes advantages well.',
    direction: 'higher',
  }),
  metric({
    key: 'lateLeadConversion',
    label: 'Late Lead Conversion',
    category: 'Conversion',
    scope: ['player', 'globalCorrelation'],
    format: 'percent',
    description: 'How often late leads become wins.',
    formula: 'winsWhenLateLeading / max(1, lateGamesLed)',
    meaning: 'Higher means better clutch closing ability.',
    direction: 'higher',
  }),
  metric({
    key: 'interactionIndex',
    label: 'Interaction Index',
    category: 'Style',
    scope: ['player', 'globalCorrelation'],
    format: 'decimal',
    description: 'Composite interaction signal built from assists and objectives.',
    formula: 'assists + contracts',
    meaning: 'Higher means a player is more interaction-heavy.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'aggroIndex',
    label: 'Aggro Index',
    category: 'Style',
    scope: ['player', 'globalCorrelation'],
    format: 'decimal',
    description: 'Composite aggression signal built from early pressure, late pressure, and objective pressure.',
    formula: 'earlyLeadRate + lateLeadRate + objectivesPerGame',
    meaning: 'Higher means a more aggressive pressure profile.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'tempoControl',
    label: 'Tempo Control',
    category: 'Tempo',
    scope: ['player', 'globalCorrelation', 'personalCorrelation', 'gameInsight'],
    format: 'decimal',
    description: 'Estimated ability to control the pace of value generation.',
    formula: 'prestigePerTurn adjusted by consistency',
    meaning: 'Higher means the player tends to dictate game flow.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'pressureReliability',
    label: 'Pressure Reliability',
    category: 'Pressure',
    scope: ['player', 'globalCorrelation', 'personalCorrelation', 'gameInsight'],
    format: 'decimal',
    description: 'Estimated stability in close and pressure-heavy situations.',
    formula: 'close-game efficiency adjusted by variance',
    meaning: 'Higher means the player stays effective under pressure.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'defenseDenialScore',
    label: 'Defense Denial Score',
    category: 'Context',
    scope: ['player', 'globalCorrelation', 'personalCorrelation', 'gameInsight'],
    format: 'decimal',
    description: 'Estimated ability to suppress opposing production.',
    formula: 'opponent output suppression composite',
    meaning: 'Higher means stronger disruption or denial impact.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'antiStyleMatchupScore',
    label: 'Anti-Style Matchup Score',
    category: 'Context',
    scope: ['player', 'globalCorrelation', 'personalCorrelation', 'gameInsight'],
    format: 'decimal',
    description: 'Estimated effectiveness into opposing playstyles.',
    formula: 'win and output lift versus style archetypes',
    meaning: 'Higher means the player matches up well into the field.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'trajectoryGrade',
    label: 'Trajectory Grade',
    category: 'Projection',
    scope: ['player', 'overview'],
    format: 'decimal',
    description: 'Forward-looking trajectory score based on recent improvement.',
    formula: 'trend strength + efficiency growth + eloDelta',
    meaning: 'Higher means the player is trending upward.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'futurePeakEstimate',
    label: 'Future Peak Estimate',
    category: 'Projection',
    scope: ['player', 'overview'],
    format: 'decimal',
    description: 'Estimated future ceiling from current trend and efficiency.',
    formula: 'current level + growth factor',
    meaning: 'Higher means a stronger projected ceiling.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'metaImpactScore',
    label: 'Meta Impact Score',
    category: 'Derived',
    scope: ['player', 'globalCorrelation', 'personalCorrelation'],
    format: 'decimal',
    description: 'Composite score for how strongly a player shapes the broader environment.',
    formula: 'style pressure + consistency + win conversion composite',
    meaning: 'Higher means the player has a stronger meta-shaping profile.',
    direction: 'higher',
    decimals: 2,
  }),
  metric({
    key: 'gameLengthVsWinnerPrestige',
    label: 'Game Length vs Winner Prestige',
    category: 'Derived',
    scope: ['gameCorrelation'],
    format: 'decimal',
    description: 'Relationship between game length and winner prestige output.',
    formula: 'pearsonCorrelation(gameLength, winnerPrestige)',
    meaning: 'Use this to see whether longer games favor bigger winning outputs.',
    direction: 'neutral',
    decimals: 2,
  }),
  metric({
    key: 'failureRateVsWinning',
    label: 'Failure Rate vs Winning',
    category: 'Derived',
    scope: ['gameCorrelation'],
    format: 'decimal',
    description: 'Relationship between failure rate and whether the eventual winner wins with control.',
    formula: 'pearsonCorrelation(failureRate, winnerFlag)',
    meaning: 'Positive values mean messy games tend to favor winning outcomes for the tracked side.',
    direction: 'neutral',
    decimals: 2,
  }),
  metric({
    key: 'interactionDensityVsObjectiveLeaderWinning',
    label: 'Interaction Density vs Objective Leader Winning',
    category: 'Derived',
    scope: ['gameCorrelation'],
    format: 'decimal',
    description: 'Relationship between interaction density and whether the objective leader wins.',
    formula: 'pearsonCorrelation(interactionDensity, objectiveLeaderWinning)',
    meaning: 'Use this to see whether more interactive games reward the objective leader.',
    direction: 'neutral',
    decimals: 2,
  }),
];

export const METRIC_MAP: Record<string, MetricDefinition> = Object.fromEntries(
  METRICS.map((metric) => [metric.key, metric])
);

export const PLAYER_METRICS = METRICS.filter((metric) =>
  metric.scope.includes('player')
);

export const OVERVIEW_METRICS = METRICS.filter((metric) =>
  metric.scope.includes('overview')
);

export const GLOBAL_CORRELATION_METRICS = METRICS.filter((metric) =>
  metric.scope.includes('globalCorrelation')
);

export const PERSONAL_CORRELATION_METRICS = METRICS.filter((metric) =>
  metric.scope.includes('personalCorrelation')
);

export const GAME_CORRELATION_METRICS = METRICS.filter((metric) =>
  metric.scope.includes('gameCorrelation')
);

export const GAME_INSIGHT_METRICS = METRICS.filter((metric) =>
  metric.scope.includes('gameInsight')
);

export const METRIC_KEYS = METRICS.map((metric) => metric.key);

export type MetricKey = (typeof METRIC_KEYS)[number];

export function getMetric(key: string): MetricDefinition | undefined {
  return METRIC_MAP[key];
}

export function getMetricOrFallback(key: string): MetricDefinition {
  return (
    METRIC_MAP[key] ??
    metric({
      key,
      label: key,
      category: 'Derived',
      scope: ['player'],
      format: 'decimal',
      description: 'Fallback metric definition.',
      formula: key,
      meaning: 'No registered definition exists yet for this metric.',
      direction: 'neutral',
    })
  );
}

export function getMetricsByScope(scope: MetricScope): MetricDefinition[] {
  return METRICS.filter((metric) => metric.scope.includes(scope));
}

export function hasMetric(key: string): boolean {
  return Boolean(METRIC_MAP[key]);
}

export function getMetricLabel(key: string): string {
  return getMetricOrFallback(key).label;
}

export function getMetricFormat(key: string): MetricFormat {
  return getMetricOrFallback(key).format;
}

export function getMetricDirection(key: string): MetricDirection {
  return getMetricOrFallback(key).direction ?? 'neutral';
}
