type Input = {
  hostProfileId: string;
  activeGame: {
    id: string;
    createdAt?: number;
    groupId?: string;
    groupName?: string;
    players?: Array<{
      id: string;
      name?: string;
      displayName?: string;
      color?: string;
      assignedCardArtIndex?: number | null;
      startOrder?: number;
    }>;
    rounds?: Array<{
      playerId: string;
      prestige?: number;
      contracts?: number;
      failures?: number;
      assistRecipients?: Record<string, number>;
      assistPrestigeRecipients?: Record<string, number>;
      objectiveCount?: number;
      objectivePrestige?: number;
      createdAt?: number;
    }>;
    totals?: Record<
      string,
      {
        prestige?: number;
        totalPrestige?: number;
        directPrestige?: number;
        assistPrestigeReceived?: number;
        objectivePrestige?: number;
        score?: number;
        assists?: number;
        failures?: number;
        contracts?: number;
      }
    >;
  };
  winnerId?: string | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildCompletedGamePayload(input: Input) {
  return {
    host_profile_id: input.hostProfileId,
    created_at: input.activeGame.createdAt
      ? new Date(input.activeGame.createdAt).toISOString()
      : undefined,
    group_id: input.activeGame.groupId ?? null,
    group_name_snapshot: input.activeGame.groupName ?? null,
    winner_profile_id: input.winnerId ?? null,
    participants: (input.activeGame.players ?? []).map((player) => {
      const totals = input.activeGame.totals?.[player.id] ?? {};
      return {
        profile_id: player.id,
        player_name_snapshot: player.name ?? "Unknown Player",
        display_name_snapshot: player.displayName ?? null,
        color_snapshot: player.color ?? null,
        assigned_card_art_index_snapshot:
          typeof player.assignedCardArtIndex === "number" &&
          Number.isFinite(player.assignedCardArtIndex)
            ? player.assignedCardArtIndex
            : null,
        start_order: player.startOrder ?? 0,
        total_prestige: toNumber(totals.totalPrestige ?? totals.prestige),
        direct_prestige: toNumber(totals.directPrestige),
        assist_prestige_received: toNumber(totals.assistPrestigeReceived),
        objective_prestige: toNumber(totals.objectivePrestige),
        score: toNumber(totals.score),
        assists: toNumber(totals.assists),
        failures: toNumber(totals.failures),
        contracts: toNumber(totals.contracts),
      };
    }),
    rounds: (input.activeGame.rounds ?? []).map((round, index) => ({
      participant_id: round.playerId,
      round_index: index,
      prestige: toNumber(round.prestige),
      contracts: toNumber(round.contracts),
      failures: toNumber(round.failures),
      assist_recipients: round.assistRecipients ?? {},
      assist_prestige_recipients: round.assistPrestigeRecipients ?? {},
      objective_count: toNumber(round.objectiveCount),
      objective_prestige: toNumber(round.objectivePrestige),
      created_at: round.createdAt
        ? new Date(round.createdAt).toISOString()
        : undefined,
    })),
  };
}
