export type Tab = "game" | "leaderboard" | "hubs";

export type PlayerLike = {
  id: string;
  name?: string;
  color?: string;
  initials?: string;
  assignedCardArtIndex?: number | null;
  wins?: number;
  gamesPlayed?: number;
  score?: number;
  totalPrestige?: number;
};

export type GroupLike = {
  id: string;
  name: string;
  playerIds: string[];
  createdAt?: number;
  objectiveStatsEligible?: boolean;
  inferredUseCount?: number;
  inferredRecentAt?: number;
};

export type PlayerTotals = {
  score?: number;
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  objectivePrestige?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
};

export type GamePlayer = {
  id?: string;
  playerId?: string;
  name?: string;
  color?: string;
  initials?: string;
  assignedCardArtIndex?: number | null;
  score?: number;
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
};

export type GameLike = {
  id?: string;
  groupId?: string;
  groupName?: string;
  createdAt?: number;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  totals?: Record<string, PlayerTotals>;
  players?: GamePlayer[];
};

export type SortMetric =
  | "elo"
  | "wins"
  | "games"
  | "score"
  | "prestige"
  | "efficiency"
  | "avgPrestige";

export type EnrichedPlayer = {
  id: string;
  name: string;
  color?: string;
  initials?: string;
  assignedCardArtIndex?: number | null;
  elo: number;
  wins: number;
  gamesPlayed: number;
  score: number;
  prestige: number;
  efficiency: number;
  avgPrestige: number;
};
