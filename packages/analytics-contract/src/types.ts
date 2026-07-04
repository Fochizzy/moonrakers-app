export type AnalyticsHomeParams = {
  profileId: string;
};

export type StatsScreenParams = {
  profileId: string;
};

export type InsightsScreenParams = {
  profileId: string;
};

export type ChartDatasetParams = {
  chartKey: string;
  profileId: string;
  focusPlayerId: string | null;
  comparePlayerId: string | null;
  scopedPlayerIds: string[] | null;
  selectedGameId: string | null;
  metricKey: string | null;
  lineMode: string | null;
  graphMode: string | null;
  opponentId: string | null;
};

export type ChartSetupParams = {
  chartKey: string;
  profileId: string;
};

export type EloScreenParams = {
  profileId: string;
  focusPlayerId: string | null;
  opponentId: string | null;
  sortKey: string | null;
};

export type RefreshServerAuthoredAnalyticsParams = {
  profileId: string;
};

export type PlayerProfileScreenParams = {
  profileId: string;
  focusPlayerId: string | null;
  opponentId: string | null;
};

export type AnalyticsMetricCard = {
  key: string;
  label: string;
  value: string | number;
  accent?: string;
  metricKey?: string;
};

export type AnalyticsTopSignal = {
  key: string;
  label: string;
  value: number;
  strength: string;
  tone: string;
  meaning: string;
};

export type AnalyticsPlayerOption = {
  id: string;
  name: string;
  color?: string | null;
  assignedCardArtIndex?: number | null;
};

export type AnalyticsHomePayload = {
  generatedAt: string;
  hero: {
    players: number;
    games: number;
    views: number;
  };
  cards: AnalyticsMetricCard[];
};

export type StatsScreenPayload = {
  generatedAt: string;
  overview: {
    hero: {
      players: number;
      games: number;
      takeaway: string;
    };
    cards: AnalyticsMetricCard[];
    topSignals: AnalyticsTopSignal[];
    halftimeProfile?: Record<string, unknown>;
    playerCountSplit?: Record<string, unknown>[];
  };
  players: {
    options: AnalyticsPlayerOption[];
    selectedPlayerId: string | null;
    detail: Record<string, unknown> | null;
  };
  playstyle: Record<string, unknown>;
  correlations: Record<string, unknown>;
  games: Record<string, unknown>;
  contractEfficiency?: Record<string, unknown>;
  groupMeta?: Record<string, unknown>;
  headToHead?: Record<string, unknown>[];
};

export type InsightsScreenPayload = {
  generatedAt: string;
  meta: {
    games: number;
  };
  cards: AnalyticsMetricCard[];
  topSignals: AnalyticsTopSignal[];
  relationships: Record<string, unknown>;
  correlations: Record<string, unknown>;
};

export type ChartDatasetPayload = {
  chartKey: string;
  generatedAt: string;
  title?: string;
  subtitle?: string;
  emptyState?: {
    title: string;
    subtitle?: string;
  } | null;
  data: Record<string, unknown>;
};

export type ChartSetupOption = {
  key: string;
  label: string;
};

export type EloMetricCard = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "accent" | "blue" | "green" | "danger";
};

export type EloPlayerOption = {
  id: string;
  name: string;
  label: string;
  displayName?: string | null;
  playerName?: string | null;
  color?: string | null;
  assignedCardArtIndex?: number | null;
  gamesPlayed?: number;
  currentElo?: number;
};

export type EloLeaderboardRow = {
  rank: number;
  playerId: string;
  name: string;
  color?: string | null;
  assignedCardArtIndex?: number | null;
  currentElo: number;
  peakElo: number;
  confidence: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  score: number;
  prestige: number;
  efficiency: number;
  avgPrestige: number;
};

export type EloSummary = {
  playerId: string | null;
  name: string;
  currentElo: number;
  peakElo: number;
  confidence: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  avgDelta: number;
  bestDelta: number;
  worstDelta: number;
  recentForm: string;
  score?: number;
  prestige?: number;
  efficiency?: number;
  avgPrestige?: number;
};

export type EloSectionPayload = {
  title: string;
  cards: EloMetricCard[];
};

export type EloInsightPayload = {
  title: string;
  body: string;
};

export type EloScreenPayload = {
  generatedAt: string;
  sortKey: string;
  playerOptions: EloPlayerOption[];
  selectedPlayerId: string | null;
  selectedOpponentId: string | null;
  leaderboardRows: EloLeaderboardRow[];
  summary: EloSummary | null;
  topCards: EloMetricCard[];
  sections: Record<string, EloSectionPayload>;
  insights: Record<string, EloInsightPayload>;
  emptyState?: {
    title: string;
    description?: string;
  } | null;
};

export type PlayerProfileScreenPayload = {
  generatedAt: string;
  selectedPlayerId: string | null;
  selectedOpponentId: string | null;
  playerOptions: EloPlayerOption[];
  signedInTopPlayerOptions?: EloPlayerOption[];
  hero: {
    id: string | null;
    name: string;
    color?: string | null;
    assignedCardArtIndex?: number | null;
    currentElo: number;
    peakElo: number;
    winRate: number;
    totalWins: number;
    totalGames: number;
  };
  quickActions?: {
    compareLabel?: string | null;
    chartsLabel?: string | null;
    recentGamesLabel?: string | null;
  } | null;
  topCards: EloMetricCard[];
  activeInsight: EloInsightPayload | null;
  profileInsight: EloInsightPayload | null;
  tabs: Record<string, EloSectionPayload>;
  tabInsights?: Record<string, EloInsightPayload>;
  moonrakersIntel: Record<string, unknown> | null;
  opponentOptions: EloPlayerOption[];
  topOpponentOptions: EloPlayerOption[];
  recentGames: Array<Record<string, unknown>>;
  emptyState?: {
    title: string;
    description?: string;
  } | null;
};

export type LiveAnalyticsQueryState<TPayload> = {
  queryKey: string;
  payload: TPayload | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  isStale: boolean;
  staleMessage: string | null;
  lastSuccessAt: number | null;
};

export type ChartSetupPayload = {
  chartKey: string;
  generatedAt: string;
  focusPlayerOptions: ChartSetupOption[];
  comparePlayerOptions: ChartSetupOption[];
  scopePlayerOptions: ChartSetupOption[];
  metricOptions: ChartSetupOption[];
  lineModeOptions: ChartSetupOption[];
  eloViewOptions: ChartSetupOption[];
  opponentOptions: ChartSetupOption[];
  defaults: {
    focusPlayerId: string | null;
    comparePlayerId: string | null;
    scopedPlayerIds: string[];
    metricKey: string | null;
    lineMode: string | null;
    eloTab: string | null;
    opponentId: string | null;
  };
  emptyState?: {
    title: string;
    description?: string;
  } | null;
};
