type LegacyMigrationPayload = {
  groups: Array<{
    id: string;
    name: string;
    player_ids: string[];
  }>;
  games: Array<{
    id: string;
    created_at?: string | null;
    group_id?: string | null;
    group_name_snapshot?: string | null;
    winner_profile_id?: string | null;
    participants: Array<{
      legacy_player_id: string;
      profile_id?: string | null;
      player_name_snapshot: string;
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
    }>;
    rounds: Array<{
      legacy_player_id: string;
      round_index?: number | null;
      prestige?: number | null;
      contracts?: number | null;
      failures?: number | null;
      assist_recipients?: Record<string, number> | null;
      assist_prestige_recipients?: Record<string, number> | null;
      objective_count?: number | null;
      objective_prestige?: number | null;
      created_at?: string | null;
    }>;
  }>;
};
type LegacyGroup = LegacyMigrationPayload["groups"][number];
type LegacyGame = LegacyMigrationPayload["games"][number];
type LegacyParticipant = LegacyGame["participants"][number];

type ExistingGroupRow = {
  id: string;
  name?: string | null;
  group_members?: Array<{ profile_id?: string | null }> | null;
};

type ExistingGameRow = {
  id: string;
  created_at?: string | null;
  group_name_snapshot?: string | null;
  game_participants?: Array<{
    player_name_snapshot?: string | null;
    start_order?: number | null;
  }> | null;
};

function normalizeName(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function toMillis(value: unknown) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeIdList(ids: string[]) {
  return [...ids].map((id) => String(id ?? "").trim()).filter(Boolean).sort();
}

function buildParticipantSignature(
  participants: Array<{
    player_name_snapshot?: string | null;
    start_order?: number | null;
  }>,
) {
  return [...participants]
    .map((participant) => ({
      name: normalizeName(participant.player_name_snapshot),
      startOrder: toNumber(participant.start_order),
    }))
    .sort((left, right) => left.startOrder - right.startOrder)
    .map((participant) => `${participant.startOrder}:${participant.name}`)
    .join("|");
}

function buildParticipantReferenceId(participant: LegacyParticipant) {
  const profileId = String(participant.profile_id ?? "").trim();
  if (profileId) {
    return profileId;
  }

  const snapshotName = String(participant.player_name_snapshot ?? "").trim();
  return snapshotName ? `legacy-${snapshotName.toLowerCase()}` : `legacy-unknown`;
}

function mapAssistRecord(
  value: unknown,
  participantReferenceIds: Map<string, string>,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([legacyId, amount]) => [
      participantReferenceIds.get(String(legacyId).trim()) ?? String(legacyId).trim(),
      toNumber(amount),
    ]),
  );
}

export function findMatchingGroupId(
  existingGroups: ExistingGroupRow[],
  targetGroup: LegacyGroup,
) {
  const targetPlayerIds = normalizeIdList(targetGroup.player_ids ?? []);

  for (const group of existingGroups) {
    const groupName = String(group.name ?? "").trim();
    if (groupName !== targetGroup.name) {
      continue;
    }

    const existingPlayerIds = normalizeIdList(
      (group.group_members ?? []).map((member) => String(member.profile_id ?? "").trim()),
    );

    if (existingPlayerIds.length !== targetPlayerIds.length) {
      continue;
    }

    if (existingPlayerIds.every((id, index) => id === targetPlayerIds[index])) {
      return group.id;
    }
  }

  return null;
}

export function findMatchingGameId(
  existingGames: ExistingGameRow[],
  targetGame: LegacyGame,
) {
  const targetCreatedAt = toMillis(targetGame.created_at);
  const targetGroupName = String(targetGame.group_name_snapshot ?? "").trim();
  const targetSignature = buildParticipantSignature(targetGame.participants ?? []);

  for (const game of existingGames) {
    if (toMillis(game.created_at) !== targetCreatedAt) {
      continue;
    }

    if (String(game.group_name_snapshot ?? "").trim() !== targetGroupName) {
      continue;
    }

    const existingSignature = buildParticipantSignature(game.game_participants ?? []);
    if (existingSignature === targetSignature) {
      return game.id;
    }
  }

  return null;
}

type ImportLegacyPayloadInput = {
  hostProfileId: string;
  payload: LegacyMigrationPayload;
};

export async function importLegacyPayload(input: ImportLegacyPayloadInput) {
  const hostProfileId = String(input.hostProfileId ?? "").trim();
  const payload = input.payload;
  const { supabase } = await import("../supabase");

  const [existingGroupsResult, existingGamesResult] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, group_members ( profile_id )")
      .eq("created_by", hostProfileId),
    supabase
      .from("games")
      .select(
        `
          id,
          created_at,
          group_name_snapshot,
          game_participants (
            player_name_snapshot,
            start_order
          )
        `,
      )
      .eq("host_profile_id", hostProfileId),
  ]);

  if (existingGroupsResult.error) {
    throw existingGroupsResult.error;
  }

  if (existingGamesResult.error) {
    throw existingGamesResult.error;
  }

  const existingGroups = [...(existingGroupsResult.data ?? [])] as ExistingGroupRow[];
  const existingGames = [...(existingGamesResult.data ?? [])] as ExistingGameRow[];
  const groupIdByLegacyId = new Map<string, string>();
  let importedGroups = 0;
  let importedGames = 0;

  for (const group of payload.groups ?? []) {
    const matchedGroupId = findMatchingGroupId(existingGroups, group);
    if (matchedGroupId) {
      groupIdByLegacyId.set(group.id, matchedGroupId);
      continue;
    }

    const { data: insertedGroup, error: insertGroupError } = await supabase
      .from("groups")
      .insert({
        created_by: hostProfileId,
        name: group.name,
      })
      .select("id, name")
      .single();

    if (insertGroupError) {
      throw insertGroupError;
    }

    const groupId = String(insertedGroup.id);
    groupIdByLegacyId.set(group.id, groupId);

    if ((group.player_ids ?? []).length > 0) {
      const { error: insertMembersError } = await supabase
        .from("group_members")
        .insert(
          (group.player_ids ?? []).map((profileId, index) => ({
            group_id: groupId,
            profile_id: profileId,
            position: index,
          })),
        );

      if (insertMembersError) {
        throw insertMembersError;
      }
    }

    existingGroups.push({
      id: groupId,
      name: group.name,
      group_members: (group.player_ids ?? []).map((profileId) => ({
        profile_id: profileId,
      })),
    });
    importedGroups += 1;
  }

  for (const game of payload.games ?? []) {
    const matchedGameId = findMatchingGameId(existingGames, game);
    if (matchedGameId) {
      continue;
    }

    const resolvedGroupId = (() => {
      const legacyGroupId = String(game.group_id ?? "").trim();
      return legacyGroupId ? groupIdByLegacyId.get(legacyGroupId) ?? null : null;
    })();

    const createdAt =
      String(game.created_at ?? "").trim() || new Date().toISOString();

    const { data: insertedGame, error: insertGameError } = await supabase
      .from("games")
      .insert({
        host_profile_id: hostProfileId,
        group_id: resolvedGroupId,
        group_name_snapshot: game.group_name_snapshot ?? null,
        status: "finished",
        created_at: createdAt,
        finished_at: createdAt,
        winner_profile_id: game.winner_profile_id ?? null,
      })
      .select("id")
      .single();

    if (insertGameError) {
      throw insertGameError;
    }

    const insertedGameId = String(insertedGame.id);
    const participantRowIds = new Map<string, string>();
    const participantReferenceIds = new Map<string, string>();
    const insertedParticipantsForMatch: ExistingGameRow["game_participants"] = [];

    for (const participant of game.participants ?? []) {
      const { data: insertedParticipant, error: insertParticipantError } = await supabase
        .from("game_participants")
        .insert({
          game_id: insertedGameId,
          profile_id: participant.profile_id ?? null,
          player_name_snapshot: participant.player_name_snapshot,
          color_snapshot: participant.color_snapshot ?? null,
          assigned_card_art_index_snapshot:
            participant.assigned_card_art_index_snapshot ?? null,
          start_order: participant.start_order ?? 0,
          total_prestige: participant.total_prestige ?? 0,
          direct_prestige: participant.direct_prestige ?? 0,
          assist_prestige_received:
            participant.assist_prestige_received ?? 0,
          objective_prestige: participant.objective_prestige ?? 0,
          score: participant.score ?? 0,
          assists: participant.assists ?? 0,
          failures: participant.failures ?? 0,
          contracts: participant.contracts ?? 0,
          is_winner: Boolean(participant.is_winner),
        })
        .select("id, player_name_snapshot, start_order")
        .single();

      if (insertParticipantError) {
        throw insertParticipantError;
      }

      participantRowIds.set(
        String(participant.legacy_player_id ?? "").trim(),
        String(insertedParticipant.id),
      );
      participantReferenceIds.set(
        String(participant.legacy_player_id ?? "").trim(),
        buildParticipantReferenceId(participant),
      );
      insertedParticipantsForMatch?.push({
        player_name_snapshot: insertedParticipant.player_name_snapshot,
        start_order: insertedParticipant.start_order,
      });
    }

    const roundRows = (game.rounds ?? [])
      .map((round, index) => {
        const participantId = participantRowIds.get(
          String(round.legacy_player_id ?? "").trim(),
        );

        if (!participantId) {
          return null;
        }

        return {
          game_id: insertedGameId,
          participant_id: participantId,
          round_index:
            typeof round.round_index === "number" && Number.isFinite(round.round_index)
              ? round.round_index
              : index,
          prestige: round.prestige ?? 0,
          contracts: round.contracts ?? 0,
          failures: round.failures ?? 0,
          assist_recipients: mapAssistRecord(
            round.assist_recipients,
            participantReferenceIds,
          ),
          assist_prestige_recipients: mapAssistRecord(
            round.assist_prestige_recipients,
            participantReferenceIds,
          ),
          objective_count: round.objective_count ?? 0,
          objective_prestige: round.objective_prestige ?? 0,
          created_at:
            String(round.created_at ?? "").trim() || createdAt,
        };
      })
      .filter(Boolean);

    if (roundRows.length > 0) {
      const { error: insertRoundsError } = await supabase
        .from("game_rounds")
        .insert(roundRows);

      if (insertRoundsError) {
        throw insertRoundsError;
      }
    }

    existingGames.push({
      id: insertedGameId,
      created_at: createdAt,
      group_name_snapshot: game.group_name_snapshot ?? null,
      game_participants: insertedParticipantsForMatch ?? [],
    });
    importedGames += 1;
  }

  if (importedGames > 0) {
    const { error: refreshRollupsError } = await supabase.rpc(
      "refresh_rollups_after_legacy_import",
      {
        target_profile_id: hostProfileId,
      },
    );

    if (refreshRollupsError) {
      throw refreshRollupsError;
    }
  }

  return {
    importedGroups,
    importedGames,
  };
}
