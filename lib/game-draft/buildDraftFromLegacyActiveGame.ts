import type { ActiveGame } from "../../store/useStore.ts";

import type { GameDraft } from "./types.ts";

type BuildDraftFromLegacyActiveGameInput = {
  profileId: string;
  activeGame: ActiveGame;
  now?: number;
};

function cloneRounds(rounds: ActiveGame["rounds"]) {
  return (Array.isArray(rounds) ? rounds : []).map((round) => ({
    ...round,
    assistRecipients: { ...(round.assistRecipients ?? {}) },
    assistPrestigeRecipients: { ...(round.assistPrestigeRecipients ?? {}) },
  }));
}

function cloneTotals(
  totals: ActiveGame["totals"],
): NonNullable<NonNullable<GameDraft["gameplay"]>["totals"]> {
  return Object.fromEntries(
    Object.entries(totals ?? {}).map(([playerId, value]) => [
      playerId,
      {
        ...(value ?? {}),
        assistPrestigeBySource: { ...(value?.assistPrestigeBySource ?? {}) },
        assistCountBySource: { ...(value?.assistCountBySource ?? {}) },
      },
    ]),
  );
}

function orderPlayers(players: ActiveGame["players"]) {
  return (Array.isArray(players) ? players : [])
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => String(player?.id ?? "").trim().length > 0)
    .sort((left, right) => {
      const leftOrder =
        typeof left.player.startOrder === "number" && Number.isFinite(left.player.startOrder)
          ? left.player.startOrder
          : left.index;
      const rightOrder =
        typeof right.player.startOrder === "number" && Number.isFinite(right.player.startOrder)
          ? right.player.startOrder
          : right.index;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.index - right.index;
    })
    .map(({ player }) => player);
}

export function buildDraftFromLegacyActiveGame({
  profileId,
  activeGame,
  now = Date.now(),
}: BuildDraftFromLegacyActiveGameInput): GameDraft {
  const orderedPlayers = orderPlayers(activeGame.players);
  const orderedIds = orderedPlayers.map((player) => String(player.id));

  return {
    profileId: String(profileId ?? "").trim(),
    draftId: String(activeGame.id),
    phase: "in_progress",
    revision: 0,
    updatedAt: now,
    deviceUpdatedAt: now,
    selectedPlayerIds: orderedIds,
    selectedGroupId: activeGame.groupId ?? null,
    selectedGroupName: activeGame.groupName ?? null,
    turnOrder: orderedIds,
    playerSnapshots: orderedPlayers.map((player) => ({
      id: String(player.id),
      name: player.name ?? "Unknown",
      initials: player.initials,
      color: player.color,
      assignedCardArtIndex: player.assignedCardArtIndex ?? null,
    })),
    gameplay: {
      turnIndex: activeGame.turnIndex ?? 0,
      rounds: cloneRounds(activeGame.rounds),
      totals: cloneTotals(activeGame.totals),
      current: {
        prestige: activeGame.current?.prestige ?? 0,
        contracts: activeGame.current?.contracts ?? 0,
        failures: activeGame.current?.failures ?? 0,
        assistRecipients: { ...(activeGame.current?.assistRecipients ?? {}) },
        assistPrestigeRecipients: {
          ...(activeGame.current?.assistPrestigeRecipients ?? {}),
        },
        objectiveCount: activeGame.current?.objectiveCount ?? 0,
        headToHeadFirstPlaceId: activeGame.current?.headToHeadFirstPlaceId ?? null,
        headToHeadSecondPlaceId: activeGame.current?.headToHeadSecondPlaceId ?? null,
      },
      roundCount:
        activeGame.roundCount ??
        (Array.isArray(activeGame.rounds) ? activeGame.rounds.length : 0),
      selectedWinnerId: activeGame.selectedWinnerId ?? null,
    },
  };
}
