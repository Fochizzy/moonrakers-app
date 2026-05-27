import { formatSupabaseConfigError } from "../../supabase.ts";

export type AnalyticsRpcError = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type AnalyticsRpcResult<TPayload> = {
  data: TPayload | null;
  error: AnalyticsRpcError | null;
};

export type AnalyticsRpcClient = {
  rpc<TPayload>(
    name: string,
    args: Record<string, unknown>,
  ): Promise<AnalyticsRpcResult<TPayload>>;
};

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

export type AnalyticsTurnOrderRow = {
  seat: number;
  label: string;
  appearances: number;
  wins: number;
  winRate: number;
  avgPrestige: number;
  tableSize?: number | null;
  correlation?: number | null;
};

export type AnalyticsTurnOrderGroup = {
  tableSize: number;
  label: string;
  summary?: string;
  rows: AnalyticsTurnOrderRow[];
};

export type AnalyticsMetricCluster = {
  key: string;
  label: string;
  summary: string;
  highlightKey?: string | null;
  metrics: AnalyticsMetricCard[];
};

export type AnalyticsTurnOrderSummary = {
  totalGames: number;
  turnOrderWinCorrelation: number;
  bestSeat: AnalyticsTurnOrderRow | null;
  worstSeat: AnalyticsTurnOrderRow | null;
  summary: string;
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

export type AnalyticsPlayerDetail = {
  playerId: string;
  label: string;
  summary: string;
  stats: Record<string, unknown>;
  pressureContext?: AnalyticsMetricCluster;
  [key: string]: unknown;
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
    formClosing?: AnalyticsMetricCluster;
  };
  players: {
    options: AnalyticsPlayerOption[];
    selectedPlayerId: string | null;
    detail: AnalyticsPlayerDetail | null;
  };
  playstyle: Record<string, unknown>;
  correlations: Record<string, unknown> & {
    turnOrderSummary?: AnalyticsTurnOrderSummary | null;
  };
  games: Record<string, unknown> & {
    turnOrderOverview?: AnalyticsTurnOrderRow[];
    turnOrderByTableSize?: AnalyticsTurnOrderGroup[];
  };
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

const ANALYTICS_READ_ONLY_WRITE_PATTERN =
  /cannot execute\s+(?:insert|update|delete|truncate|alter|create|drop)[^]*read-only transaction/i;

function isAnalyticsRpcClient(
  value: AnalyticsRpcClient | unknown,
): value is AnalyticsRpcClient {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { rpc?: unknown }).rpc === "function"
  );
}

export async function getDefaultAnalyticsRpcClient(): Promise<AnalyticsRpcClient> {
  const { supabase } = await import("../../supabase.ts");

  return {
    async rpc<TPayload>(name, args) {
      const result = await supabase.rpc(name as never, args as never);
      return result as AnalyticsRpcResult<TPayload>;
    },
  };
}

export async function resolveAnalyticsCall<TParams>(
  loadDefaultClient: () => Promise<AnalyticsRpcClient>,
  clientOrParams: AnalyticsRpcClient | TParams | undefined,
  maybeParams?: TParams,
) {
  if (isAnalyticsRpcClient(clientOrParams)) {
    if (maybeParams === undefined) {
      throw new Error(
        "Analytics RPC client was provided without params. Call the wrapper with (params) or (client, params).",
      );
    }

    return {
      client: clientOrParams,
      params: maybeParams,
    };
  }

  if (clientOrParams !== undefined) {
    return {
      client: await loadDefaultClient(),
      params: clientOrParams,
    };
  }

  if (maybeParams !== undefined) {
    return {
      client: await loadDefaultClient(),
      params: maybeParams,
    };
  }

  throw new Error("Analytics params are required.");
}

function shouldRetryAnalyticsReadAfterRefresh(error: AnalyticsRpcError | null) {
  if (!error) {
    return false;
  }

  const errorText = [error.message, error.details, error.hint]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join("\n");

  return ANALYTICS_READ_ONLY_WRITE_PATTERN.test(errorText);
}

export async function executeAnalyticsReadRpc<TPayload>(
  client: AnalyticsRpcClient,
  rpcName: string,
  rpcArgs: Record<string, unknown>,
  profileId: string,
) {
  const result = await client.rpc<TPayload>(rpcName, rpcArgs);

  if (!shouldRetryAnalyticsReadAfterRefresh(result.error)) {
    return unwrapAnalyticsResult(rpcName, result);
  }

  // Older analytics migrations briefly pushed a rollup refresh into read RPCs.
  // If production still has that drift, refresh explicitly and retry the read once.
  const refreshResult = await client.rpc<unknown>(
    "refresh_server_authored_analytics",
    {
      target_profile_id: profileId,
    },
  );
  unwrapAnalyticsResult("refresh_server_authored_analytics", refreshResult);

  const retriedResult = await client.rpc<TPayload>(rpcName, rpcArgs);
  return unwrapAnalyticsResult(rpcName, retriedResult);
}

export function unwrapAnalyticsResult<TPayload>(
  rpcName: string,
  result: AnalyticsRpcResult<TPayload>,
) {
  if (result.error) {
    const formatted = formatSupabaseConfigError({
      message: result.error.message
        ? `${rpcName} failed: ${result.error.message.trim()}`
        : `${rpcName} failed.`,
      details: result.error.details?.trim(),
      hint: result.error.hint?.trim(),
    });

    throw new Error(formatted || `${rpcName} failed.`);
  }

  if (result.data === null) {
    throw new Error(`${rpcName} returned no payload.`);
  }

  return result.data;
}
