import type {
  StoredGamePlayer,
  StoredPlayerTotals,
  StoredRound,
} from "../../utils/storage/storageKeys.ts";

export type GameDraftPhase =
  | "player_selection"
  | "setup"
  | "in_progress"
  | "ready_to_finish";

export type GameDraftPlayerSnapshot = Pick<
  StoredGamePlayer,
  "id" | "name" | "initials" | "color" | "assignedCardArtIndex"
>;

export type GameDraftGameplay = {
  turnIndex: number;
  rounds: StoredRound[];
  totals: Record<string, StoredPlayerTotals>;
  current: {
    prestige: number;
    contracts: number;
    failures: number;
    assistRecipients: Record<string, number>;
    assistPrestigeRecipients: Record<string, number>;
    objectiveCount: number;
    headToHeadFirstPlaceId?: string | null;
    headToHeadSecondPlaceId?: string | null;
  };
  roundCount: number;
  selectedWinnerId?: string | null;
};

export type GameDraft = {
  profileId: string;
  draftId: string;
  phase: GameDraftPhase;
  revision: number;
  updatedAt: number;
  deviceUpdatedAt: number;
  selectedPlayerIds: string[];
  selectedGroupId?: string | null;
  selectedGroupName?: string | null;
  turnOrder: string[];
  playerSnapshots: GameDraftPlayerSnapshot[];
  gameplay?: GameDraftGameplay | null;
};

export type GameDraftSyncStatus =
  | "idle"
  | "restoring"
  | "saving"
  | "saved"
  | "pending"
  | "conflict"
  | "failed";

export type GameDraftSyncState = {
  state: GameDraftSyncStatus;
  dirty: boolean;
  lastSyncedAt?: number | null;
  conflictMessage?: string | null;
};
