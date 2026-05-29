import type { ActiveGame } from "../../store/useStore.ts";

import { isGameplayDraftPhase } from "./phase.ts";
import type { GameDraft } from "./types.ts";

function createEmptyCurrent(): ActiveGame["current"] {
  return {
    prestige: 0,
    contracts: 0,
    failures: 0,
    assistRecipients: {},
    assistPrestigeRecipients: {},
    objectiveCount: 0,
    headToHeadFirstPlaceId: null,
    headToHeadSecondPlaceId: null,
  };
}

export function buildActiveGameProjection(draft: GameDraft): ActiveGame {
  if (!isGameplayDraftPhase(draft.phase)) {
    throw new Error("Only in-progress drafts can be projected to activeGame.");
  }

  const orderedPlayerIds = draft.turnOrder.length
    ? draft.turnOrder
    : draft.selectedPlayerIds;

  const players = orderedPlayerIds
    .map((playerId) =>
      draft.playerSnapshots.find((player) => player.id === playerId),
    )
    .filter((player): player is NonNullable<(typeof draft.playerSnapshots)[number]> =>
      Boolean(player),
    )
    .map((player, index) => ({
      id: player.id,
      name: player.name,
      initials: player.initials,
      color: player.color,
      assignedCardArtIndex: player.assignedCardArtIndex ?? null,
      startOrder: index,
    }));

  return {
    id: draft.draftId,
    players,
    turnIndex: draft.gameplay?.turnIndex ?? 0,
    rounds: draft.gameplay?.rounds ?? [],
    totals: (draft.gameplay?.totals ?? {}) as ActiveGame["totals"],
    current: draft.gameplay?.current ?? createEmptyCurrent(),
    createdAt: draft.updatedAt,
    groupId: draft.selectedGroupId || undefined,
    groupName: draft.selectedGroupName || undefined,
    selectedWinnerId: draft.gameplay?.selectedWinnerId ?? undefined,
    showTieBreaker: false,
    roundCount: draft.gameplay?.roundCount ?? 0,
  };
}
