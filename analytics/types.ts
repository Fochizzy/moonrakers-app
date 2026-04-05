export type TimeFilter = 'all' | 'last5' | 'last10' | 'last30d';
export type SortMode = 'elo' | 'winRate' | 'prestige' | 'recentForm';

export type PlayerLike = {
  id: string;
  name: string;
  color?: string;
};

export type StoredGamePlayer = {
  id: string;
  startOrder?: number;
  turnOrder?: number;
  position?: number;
  totalPrestige?: number;
  prestige?: number;
  score?: number;
  finalPrestige?: number;
  placement?: number;
  place?: number;
  rank?: number;
  isWinner?: boolean;
  won?: boolean;
};

export type StoredGame = {
  id?: string;
  createdAt?: number;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  totals?: Record<string, unknown>;
  players?: StoredGamePlayer[];
};

export type RelationshipMap = Record<string, Record<string, number>>;

export type LeaderboardRow = PlayerLike & {
  rating: number;
  gamesPlayed: number;
  delta: number;
  wins: number;
  prestigeTotal: number;
  winRate: number;
  avgPrestige: number;
  recentForm: number;
  series: Array<{ x: number; y: number }>;
};

export type TurnOrderSeatSummary = {
  seat: number;
  wins: number;
  games: number;
  winRate: number;
};

export type TurnOrderSummary = {
  avgWinnerSeat: number;
  avgSeat: number;
  correlation: number;
  sampleSize: number;
  seatWins: TurnOrderSeatSummary[];
};

export type StabilitySummary = {
  label: 'Early sample' | 'Stable' | 'Moderate variance' | 'High variance';
  detail: string;
  value: number;
  color: string;
};

export type PredictionConfidence = 'low' | 'moderate' | 'high';

export type ExpectedOutcome = {
  expectedWinRateLow: number;
  expectedWinRateHigh: number;
  expectedPlacementLow: number;
  expectedPlacementHigh: number;
  expectedEloDeltaLow: number;
  expectedEloDeltaHigh: number;
  confidence: PredictionConfidence;
  reasons: string[];
};

export type ConsistencyCheck = {
  title: string;
  detail: string;
  severity: 'info' | 'warning';
};

export type SystemHealth = {
  activePlayers: number;
  ratingSpread: number;
  averageRating: number;
  volatility: number;
  totalGames: number;
  healthLabel: 'Healthy' | 'Skewed' | 'Volatile' | 'Early sample';
  explanation: string;
};

export type SortableLeaderboard = ReadonlyArray<LeaderboardRow>;

export type EloCalculator = (games: StoredGame[]) => Record<string, number>;
export type EloSeriesBuilder = (
  games: StoredGame[],
  playerId: string
) => Array<{ x: number; y: number }>;
