export type ArchivePlayerTotals = {
  assistPrestigeBySource: Record<string, number>;
  assistPrestigeReceived: number;
  assistPrestigeSent: number;
  assists: number;
  contracts: number;
  directPrestige: number;
  efficiency: number;
  failures: number;
  objectiveCount: number;
  objectivePrestige: number;
  performance: number;
  score: number;
  totalPrestige: number;
};

export type ArchiveGamePlayer = {
  assignedCardArtIndex: number | null;
  color: string | null;
  id: string;
  name: string;
  startOrder: number;
};

export type ArchiveRound = {
  assistPrestigeRecipients: Record<string, number>;
  assistRecipients: Record<string, number>;
  contracts: number;
  createdAt: number;
  failures: number;
  id: string;
  objectiveCount: number;
  objectivePrestige: number;
  playerId: string;
  prestige: number;
};

export type ArchiveGame = {
  createdAt: number;
  groupId: string | null;
  groupName: string | null;
  hostProfileId: string | null;
  id: string;
  players: ArchiveGamePlayer[];
  roundCount: number;
  rounds: ArchiveRound[];
  totals: Record<string, ArchivePlayerTotals>;
  winnerId: string | null;
};

export type ArchivePlayer = {
  assignedCardArtIndex: number | null;
  color: string | null;
  id: string;
  name: string;
};

export type ArchiveGroup = {
  createdAt: number;
  id: string;
  name: string;
  playerIds: string[];
};

export type GameArchive = {
  games: ArchiveGame[];
  groups: ArchiveGroup[];
  players: ArchivePlayer[];
};
