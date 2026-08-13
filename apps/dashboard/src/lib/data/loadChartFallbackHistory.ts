import { normalizeCloudSnapshot } from "../../../../../lib/cloud/normalizeCloudSnapshot";

const GAME_SELECT = `
  id,
  host_profile_id,
  group_id,
  group_name_snapshot,
  created_at,
  winner_profile_id
`;

const PARTICIPANT_SELECT = `
  game_id,
  id,
  profile_id,
  player_name_snapshot,
  display_name_snapshot,
  color_snapshot,
  assigned_card_art_index_snapshot,
  start_order,
  total_prestige,
  direct_prestige,
  assist_prestige_received,
  objective_prestige,
  score,
  assists,
  failures,
  contracts,
  is_winner
`;

const ROUND_SELECT = `
  game_id,
  participant_id,
  round_index,
  prestige,
  contracts,
  failures,
  assist_recipients,
  assist_prestige_recipients,
  objective_count,
  objective_prestige,
  created_at
`;

type SupabaseClient = {
  from: (table: string) => any;
};

type LoadChartFallbackHistoryInput = {
  supabase: SupabaseClient;
  userId: string;
  focusPlayerId?: string | null;
  comparePlayerId?: string | null;
  opponentId?: string | null;
  scopedPlayerIds?: string[] | null;
};

type FallbackProfileRow = {
  id?: string | null;
  player_name?: string | null;
  display_name?: string | null;
};

type FallbackParticipantRow = {
  game_id?: string | null;
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

type FallbackRoundRow = {
  game_id?: string | null;
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

type FallbackGameRow = {
  id: string;
  host_profile_id?: string | null;
  group_id?: string | null;
  group_name_snapshot?: string | null;
  created_at?: string | null;
  winner_profile_id?: string | null;
  game_participants?: FallbackParticipantRow[] | null;
  game_rounds?: FallbackRoundRow[] | null;
};

type HydratedFallbackGame = FallbackGameRow & {
  game_participants: FallbackParticipantRow[];
  game_rounds: FallbackRoundRow[];
};

function normalizePlayerId(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePlayerLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLooseName(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ");
}

function normalizeLegacyAwareNameKey(value: string | null | undefined) {
  return normalizeLooseName(value)
    .replace(/^(legacy|local)\s+/i, "")
    .trim();
}

function uniquePlayerIds(values: Array<string | null | undefined>) {
  return values
    .map((value) => normalizePlayerId(value))
    .filter((value, index, items): value is string => value !== null && items.indexOf(value) === index);
}

function uniquePlayerLabels(values: Array<string | null | undefined>) {
  return values
    .map((value) => normalizePlayerLabel(value))
    .filter((value, index, items): value is string => value !== null && items.indexOf(value) === index);
}

async function loadProfileRow(supabase: SupabaseClient, playerId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, player_name, display_name")
    .eq("id", playerId);

  if (error) {
    throw error;
  }

  return ((data ?? [])[0] ?? null) as FallbackProfileRow | null;
}

async function loadGameIdsBySnapshotLabel(
  supabase: SupabaseClient,
  column: "display_name_snapshot" | "player_name_snapshot",
  playerLabel: string,
) {
  const labelKey = normalizeLegacyAwareNameKey(playerLabel);
  if (!labelKey) {
    return new Set<string>();
  }

  const { data, error } = await supabase
    .from("game_participants")
    .select(`game_id, ${column}`)
    .ilike(column, `%${playerLabel}%`);

  if (error) {
    throw error;
  }

  return new Set<string>(
    (data ?? [])
      .filter((row: Record<string, unknown>) => {
        const snapshotLabel = normalizeLegacyAwareNameKey(
          row?.[column] as string | null | undefined,
        );
        return snapshotLabel === labelKey;
      })
      .map((row: { game_id?: string | null }) => String(row?.game_id ?? "").trim())
      .filter(Boolean),
  );
}

async function loadGameIdsForPlayer(
  supabase: SupabaseClient,
  playerId: string,
  includeLegacySnapshotMatches = false,
) {
  const { data, error } = await supabase
    .from("game_participants")
    .select("game_id")
    .eq("profile_id", playerId);

  if (error) {
    throw error;
  }

  const linkedGameIds = new Set<string>(
    (data ?? [])
      .map((row: { game_id?: string | null }) => String(row?.game_id ?? "").trim())
      .filter(Boolean),
  );

  if (!includeLegacySnapshotMatches && linkedGameIds.size > 0) {
    return linkedGameIds;
  }

  const profile = await loadProfileRow(supabase, playerId);
  const profileLabels = uniquePlayerLabels([
    profile?.player_name,
    profile?.display_name,
  ]);

  if (profileLabels.length === 0) {
    return linkedGameIds;
  }

  const combinedGameIds = new Set<string>(linkedGameIds);
  for (const playerLabel of profileLabels) {
    for (const column of ["player_name_snapshot", "display_name_snapshot"] as const) {
      const snapshotGameIds = await loadGameIdsBySnapshotLabel(
        supabase,
        column,
        playerLabel,
      );
      snapshotGameIds.forEach((gameId) => {
        combinedGameIds.add(gameId);
      });
    }
  }

  return combinedGameIds;
}

function intersectGameIdSets(baseIds: Set<string>, nextIds: Set<string>) {
  return new Set<string>([...baseIds].filter((gameId) => nextIds.has(gameId)));
}

function logChartFallbackDiagnostics(payload: Record<string, unknown>) {
  console.warn(
    "[dashboard-chart-fallback]",
    JSON.stringify(payload),
  );
}

async function loadFinishedGames(
  supabase: SupabaseClient,
  candidateGameIds: Set<string>,
) {
  const { data, error } = await supabase
    .from("games")
    .select(GAME_SELECT)
    .in("id", [...candidateGameIds])
    .eq("status", "finished")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as FallbackGameRow[];
}

export async function loadChartFallbackHistory({
  supabase,
  userId,
  focusPlayerId,
  comparePlayerId,
  opponentId,
  scopedPlayerIds,
}: LoadChartFallbackHistoryInput) {
  const targetPlayerIds = uniquePlayerIds([
    focusPlayerId,
    userId,
  ]);
  const anchorPlayerId = targetPlayerIds[0] ?? null;

  if (!anchorPlayerId) {
    return { games: [], players: [] };
  }

  const pairedPlayerIds = uniquePlayerIds([
    comparePlayerId,
    opponentId,
    ...(scopedPlayerIds ?? []),
  ]).filter((playerId) => playerId !== anchorPlayerId);

  async function loadCandidateGameIds(includeLegacySnapshotMatches: boolean) {
    let candidateGameIds = await loadGameIdsForPlayer(
      supabase,
      anchorPlayerId,
      includeLegacySnapshotMatches,
    );

    for (const playerId of pairedPlayerIds) {
      if (candidateGameIds.size === 0) {
        break;
      }

      const nextIds = await loadGameIdsForPlayer(
        supabase,
        playerId,
        includeLegacySnapshotMatches,
      );
      candidateGameIds = intersectGameIdSets(candidateGameIds, nextIds);
    }

    return candidateGameIds;
  }

  let candidateGameIds = await loadCandidateGameIds(false);
  let usedLegacySnapshotMatches = false;

  if (candidateGameIds.size === 0) {
    candidateGameIds = await loadCandidateGameIds(true);
    usedLegacySnapshotMatches = true;
  }

  if (candidateGameIds.size === 0) {
    logChartFallbackDiagnostics({
      stage: "no-candidate-games",
      focusPlayerId: anchorPlayerId,
      comparePlayerId: comparePlayerId ?? null,
      opponentId: opponentId ?? null,
      scopedPlayerIds: scopedPlayerIds ?? [],
      pairedPlayerIds,
      usedLegacySnapshotMatches,
    });
    return { games: [], players: [] };
  }

  let games = await loadFinishedGames(supabase, candidateGameIds);
  let finishedGameIds = games
    .map((row: { id?: string | null }) => String(row?.id ?? "").trim())
    .filter(Boolean);

  if (finishedGameIds.length === 0 && !usedLegacySnapshotMatches) {
    candidateGameIds = await loadCandidateGameIds(true);
    usedLegacySnapshotMatches = true;

    if (candidateGameIds.size === 0) {
      logChartFallbackDiagnostics({
        stage: "legacy-retry-produced-no-candidates",
        focusPlayerId: anchorPlayerId,
        comparePlayerId: comparePlayerId ?? null,
        opponentId: opponentId ?? null,
        scopedPlayerIds: scopedPlayerIds ?? [],
        pairedPlayerIds,
        usedLegacySnapshotMatches,
      });
      return { games: [], players: [] };
    }

    games = await loadFinishedGames(supabase, candidateGameIds);
    finishedGameIds = games
      .map((row: { id?: string | null }) => String(row?.id ?? "").trim())
      .filter(Boolean);
  }

  if (finishedGameIds.length === 0) {
    logChartFallbackDiagnostics({
      stage: "no-finished-games",
      focusPlayerId: anchorPlayerId,
      comparePlayerId: comparePlayerId ?? null,
      opponentId: opponentId ?? null,
      scopedPlayerIds: scopedPlayerIds ?? [],
      pairedPlayerIds,
      candidateGameCount: candidateGameIds.size,
      usedLegacySnapshotMatches,
    });
    return { games: [], players: [] };
  }

  const [{ data: participants, error: participantsError }, { data: rounds, error: roundsError }] =
    await Promise.all([
      supabase
        .from("game_participants")
        .select(PARTICIPANT_SELECT)
        .in("game_id", finishedGameIds)
        .order("start_order", { ascending: true }),
      supabase
        .from("game_rounds")
        .select(ROUND_SELECT)
        .in("game_id", finishedGameIds)
        .order("created_at", { ascending: true }),
    ]);

  if (participantsError) {
    throw participantsError;
  }

  if (roundsError) {
    throw roundsError;
  }

  const rawGames = games as FallbackGameRow[];
  const rawParticipants = (participants ?? []) as FallbackParticipantRow[];
  const rawRounds = (rounds ?? []) as FallbackRoundRow[];

  const gamesById = new Map<string, HydratedFallbackGame>(
    rawGames.map((game) => [
      String(game.id),
      {
        ...game,
        game_participants: [],
        game_rounds: [],
      },
    ]),
  );

  rawParticipants.forEach((participant) => {
    const gameId = String(participant.game_id ?? "").trim();
    const game = gamesById.get(gameId);
    if (!game) {
      return;
    }

    game.game_participants.push(participant);
  });

  rawRounds.forEach((round) => {
    const gameId = String(round.game_id ?? "").trim();
    const game = gamesById.get(gameId);
    if (!game) {
      return;
    }

    game.game_rounds.push(round);
  });

  const snapshot = normalizeCloudSnapshot({
    games: [...gamesById.values()],
  });

  logChartFallbackDiagnostics({
    stage: "history-built",
    focusPlayerId: anchorPlayerId,
    comparePlayerId: comparePlayerId ?? null,
    opponentId: opponentId ?? null,
    scopedPlayerIds: scopedPlayerIds ?? [],
    pairedPlayerIds,
    candidateGameCount: candidateGameIds.size,
    finishedGameCount: finishedGameIds.length,
    participantRowCount: rawParticipants.length,
    roundRowCount: rawRounds.length,
    returnedGameCount: snapshot.games.length,
    returnedPlayerCount: snapshot.players.length,
    usedLegacySnapshotMatches,
  });

  return {
    games: snapshot.games as Array<Record<string, unknown>>,
    players: snapshot.players as Array<Record<string, unknown>>,
  };
}
