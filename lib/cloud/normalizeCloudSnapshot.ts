import type { AuthProfile, Game, Group, Player } from "../../store/useStore";
import { normalizeGameWithComputedTotals } from "../../utils/gameTotals";

export type CloudSnapshot = {
  profile: AuthProfile;
  players: Player[];
  groups: Group[];
  games: Game[];
};

type RawProfile = {
  id: string;
  player_name?: string | null;
  display_name?: string | null;
  favorite_color?: string | null;
  assigned_card_art_index?: number | null;
};

type RawGroupMember = {
  position?: number | null;
  profile?: RawProfile | RawProfile[] | null;
};

type RawGroup = {
  id: string;
  name: string;
  created_at?: string | null;
  objective_stats_eligible?: boolean | null;
  group_members?: RawGroupMember[] | null;
};

type RawParticipant = {
  id?: string | null;
  profile_id?: string | null;
  player_name_snapshot?: string | null;
  display_name_snapshot?: string | null;
  color_snapshot?: string | null;
  assigned_card_art_index_snapshot?: number | null;
  start_order?: number | null;
  total_prestige?: number | null;
  direct_prestige?: number | null;
  assist_prestige_received?: number | null;
  objective_prestige?: number | null;
  score?: number | null;
  assists?: number | null;
  failures?: number | null;
  contracts?: number | null;
  is_winner?: boolean | null;
};

type RawRound = {
  participant_id?: string | null;
  round_index?: number | null;
  prestige?: number | null;
  contracts?: number | null;
  failures?: number | null;
  assist_recipients?: Record<string, number> | null;
  assist_prestige_recipients?: Record<string, number> | null;
  objective_count?: number | null;
  objective_prestige?: number | null;
  created_at?: string | null;
};

type RawGame = {
  id: string;
  host_profile_id?: string | null;
  group_id?: string | null;
  group_name_snapshot?: string | null;
  created_at?: string | null;
  winner_profile_id?: string | null;
  game_participants?: RawParticipant[] | null;
  game_rounds?: RawRound[] | null;
};

type NormalizeInput = {
  profile?: RawProfile | null;
  groups?: RawGroup[] | null;
  games?: RawGame[] | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toMillis(value: string | null | undefined) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function toNumericRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, rawValue]) => [String(key), toNumber(rawValue)]),
  );
}

function resolvePlayerId(participant: RawParticipant) {
  const profileId = String(participant.profile_id ?? "").trim();
  if (profileId) {
    return profileId;
  }

  const snapshotName = String(participant.player_name_snapshot ?? "").trim();
  return snapshotName ? `legacy-${snapshotName.toLowerCase()}` : `legacy-${Date.now()}`;
}

function upsertPlayer(
  playersById: Map<string, Player>,
  input: {
    id: string;
    name?: string | null;
    color?: string | null;
    assignedCardArtIndex?: number | null;
  },
) {
  if (!input.id) {
    return;
  }

  const current = playersById.get(input.id);
  playersById.set(input.id, {
    id: input.id,
    name: String(input.name ?? current?.name ?? "Player").trim() || "Player",
    color: String(input.color ?? current?.color ?? "").trim() || undefined,
    assignedCardArtIndex:
      typeof input.assignedCardArtIndex === "number"
        ? input.assignedCardArtIndex
        : current?.assignedCardArtIndex ?? null,
  });
}

function resolveMemberProfile(member: RawGroupMember) {
  if (Array.isArray(member.profile)) {
    return member.profile[0] ?? null;
  }

  return member.profile ?? null;
}

export function normalizeCloudSnapshot(input: NormalizeInput): CloudSnapshot {
  const playersById = new Map<string, Player>();
  const groups = (input.groups ?? []).map((group) => {
    const sortedMembers = [...(group.group_members ?? [])].sort(
      (left, right) => toNumber(left.position) - toNumber(right.position),
    );

    const playerIds = sortedMembers
      .map((member) => resolveMemberProfile(member))
      .filter((profile): profile is RawProfile => Boolean(profile?.id))
      .map((profile) => {
        upsertPlayer(playersById, {
          id: profile.id,
          name: profile.player_name ?? profile.display_name,
          color: profile.favorite_color ?? null,
          assignedCardArtIndex: profile.assigned_card_art_index ?? null,
        });
        return profile.id;
      });

    return {
      id: group.id,
      name: group.name,
      playerIds,
      createdAt: toMillis(group.created_at),
      objectiveStatsEligible: Boolean(group.objective_stats_eligible),
    } satisfies Group;
  });

  const games = (input.games ?? []).map((game) => {
    const participants = [...(game.game_participants ?? [])].sort(
      (left, right) => toNumber(left.start_order) - toNumber(right.start_order),
    );
    const participantIdsByRowId = new Map<string, string>();

    const players = participants.map((participant, index) => {
      const id = resolvePlayerId(participant);
      const participantRowId = String(participant.id ?? "").trim();
      const name =
        String(
          participant.player_name_snapshot ??
            participant.display_name_snapshot ??
            `Player ${index + 1}`,
        ).trim() || `Player ${index + 1}`;

      upsertPlayer(playersById, {
        id,
        name,
        color: participant.color_snapshot ?? null,
        assignedCardArtIndex:
          participant.assigned_card_art_index_snapshot ?? null,
      });

      if (participantRowId) {
        participantIdsByRowId.set(participantRowId, id);
      }

      return {
        id,
        name,
        color: String(participant.color_snapshot ?? "").trim() || undefined,
        assignedCardArtIndex:
          typeof participant.assigned_card_art_index_snapshot === "number"
            ? participant.assigned_card_art_index_snapshot
            : null,
        startOrder: typeof participant.start_order === "number" ? participant.start_order : index,
      };
    });

    const rounds = [...(game.game_rounds ?? [])]
      .sort((left, right) => {
        const byRoundIndex = toNumber(left.round_index) - toNumber(right.round_index);
        if (byRoundIndex !== 0) {
          return byRoundIndex;
        }

        return toMillis(left.created_at) - toMillis(right.created_at);
      })
      .map((round, index) => {
        const playerId = participantIdsByRowId.get(
          String(round.participant_id ?? "").trim(),
        );

        if (!playerId) {
          return null;
        }

        return {
          id: `${game.id}-round-${toNumber(round.round_index)}-${index}`,
          playerId,
          prestige: toNumber(round.prestige),
          contracts: toNumber(round.contracts),
          failures: toNumber(round.failures),
          turnsAtBase: 0,
          assistRecipients: toNumericRecord(round.assist_recipients),
          assistPrestigeRecipients: toNumericRecord(
            round.assist_prestige_recipients,
          ),
          objectiveCount: toNumber(round.objective_count),
          objectivePrestige: toNumber(round.objective_prestige),
          createdAt: toMillis(round.created_at),
        };
      })
      .filter((round): round is NonNullable<typeof round> => Boolean(round));

    const totals = Object.fromEntries(
      participants.map((participant) => {
        const id = resolvePlayerId(participant);
        return [
          id,
          {
            prestige: toNumber(participant.total_prestige),
            totalPrestige: toNumber(participant.total_prestige),
            directPrestige: toNumber(participant.direct_prestige),
            assistPrestigeReceived: toNumber(participant.assist_prestige_received),
            assistPrestigeSent: 0,
            assistPrestigeBySource: {},
            objectivePrestige: toNumber(participant.objective_prestige),
            score: toNumber(participant.score),
            assists: toNumber(participant.assists),
            failures: toNumber(participant.failures),
            contracts: toNumber(participant.contracts),
          },
        ];
      }),
    );

    const winnerId =
      String(game.winner_profile_id ?? "").trim() ||
      participants.find((participant) => participant.is_winner)?.profile_id ||
      undefined;

    const normalizedGame = normalizeGameWithComputedTotals({
      id: game.id,
      hostProfileId: String(game.host_profile_id ?? "").trim() || undefined,
      groupId: String(game.group_id ?? "").trim() || undefined,
      groupName: String(game.group_name_snapshot ?? "").trim() || undefined,
      createdAt: toMillis(game.created_at),
      winnerId,
      selectedWinnerId: winnerId,
      manualWinnerId: winnerId,
      players,
      totals,
      rounds,
      roundCount: rounds.length,
    });

    return {
      ...normalizedGame,
      selectedWinnerId: normalizedGame.winnerId,
      manualWinnerId: normalizedGame.winnerId,
    } satisfies Game;
  });

  const profile = input.profile
    ? {
        id: input.profile.id,
        player_name: input.profile.player_name ?? null,
        display_name: input.profile.display_name ?? null,
        favorite_color: input.profile.favorite_color ?? null,
        assigned_card_art_index: input.profile.assigned_card_art_index ?? null,
      }
    : null;

  if (input.profile?.id) {
    upsertPlayer(playersById, {
      id: input.profile.id,
      name: input.profile.player_name ?? input.profile.display_name,
      color: input.profile.favorite_color ?? null,
      assignedCardArtIndex: input.profile.assigned_card_art_index ?? null,
    });
  }

  return {
    profile,
    players: Array.from(playersById.values()),
    groups,
    games,
  };
}
