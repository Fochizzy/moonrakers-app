import { normalizeGameWithComputedTotals } from "@/utils/gameTotals";

type LocalPlayer = {
  id: string;
  name?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
};

type LocalGroup = {
  id: string;
  name: string;
  playerIds?: string[];
};

type LocalGamePlayer = {
  id?: string;
  name?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
  startOrder?: number;
};

type LocalGameTotals = {
  totalPrestige?: number;
  prestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  objectivePrestige?: number;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
};

type LocalGameRound = {
  playerId?: string;
  prestige?: number;
  contracts?: number;
  failures?: number;
  assistRecipients?: Record<string, number>;
  assistPrestigeRecipients?: Record<string, number>;
  objectiveCount?: number;
  objectivePrestige?: number;
  createdAt?: number;
};

type LocalGame = {
  id: string;
  players?: LocalGamePlayer[];
  totals?: Record<string, LocalGameTotals>;
  rounds?: LocalGameRound[];
  timeline?: LocalGameRound[];
  createdAt?: number;
  groupId?: string;
  groupName?: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
};

type ResolvedProfile = {
  id: string;
  player_name: string;
};

type Input = {
  signedInProfileId: string;
  signedInPlayerName: string;
  localPlayers?: LocalPlayer[];
  localGroups?: LocalGroup[];
  localGames?: LocalGame[];
  resolvedProfilesByName?: Record<string, ResolvedProfile>;
};

function normalizeName(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveWinnerId(game: LocalGame) {
  return String(
    game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId ?? "",
  ).trim();
}

function toNumericRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, rawValue]) => [String(key), toNumber(rawValue)]),
  );
}

export function buildLegacyMigrationPayload(input: Input) {
  const resolvedProfiles = input.resolvedProfilesByName ?? {};
  const hostName = normalizeName(input.signedInPlayerName);
  const localPlayersById = new Map(
    (input.localPlayers ?? []).map((player) => [player.id, player]),
  );

  const resolveProfile = (name: string) => {
    if (name === hostName) {
      return (
        resolvedProfiles[name] ?? {
          id: input.signedInProfileId,
          player_name: input.signedInPlayerName,
        }
      );
    }

    return resolvedProfiles[name] ?? null;
  };

  const groups = (input.localGroups ?? []).filter((group) =>
    (group.playerIds ?? []).every((playerId) => {
      const player = localPlayersById.get(playerId);
      const normalizedName = normalizeName(player?.name);
      return Boolean(resolveProfile(normalizedName));
    }),
  ).map((group) => ({
    id: group.id,
    name: group.name,
    player_ids: (group.playerIds ?? [])
      .map((playerId) => localPlayersById.get(playerId))
      .map((player) => resolveProfile(normalizeName(player?.name)))
      .filter((profile): profile is ResolvedProfile => Boolean(profile))
      .map((profile) => profile.id),
  }));

  const games = (input.localGames ?? []).map((game) => {
    const playersById = new Map<string, LocalGamePlayer>();
    for (const player of game.players ?? []) {
      const playerId = String(player.id ?? "").trim();
      if (!playerId) {
        continue;
      }

      playersById.set(playerId, player);
    }

    for (const playerId of Object.keys(game.totals ?? {})) {
      if (!playersById.has(playerId)) {
        playersById.set(playerId, {
          id: playerId,
          name: localPlayersById.get(playerId)?.name,
          color: localPlayersById.get(playerId)?.color,
          assignedCardArtIndex:
            localPlayersById.get(playerId)?.assignedCardArtIndex ?? null,
        });
      }
    }

    const rounds = Array.isArray(game.rounds) && game.rounds.length > 0
      ? game.rounds
      : Array.isArray(game.timeline)
        ? game.timeline
        : [];

    for (const round of rounds) {
      const playerId = String(round.playerId ?? "").trim();
      if (!playerId || playersById.has(playerId)) {
        continue;
      }

      playersById.set(playerId, {
        id: playerId,
        name: localPlayersById.get(playerId)?.name,
        color: localPlayersById.get(playerId)?.color,
        assignedCardArtIndex:
          localPlayersById.get(playerId)?.assignedCardArtIndex ?? null,
      });
    }

    const orderedPlayers = Array.from(playersById.values()).sort((left, right) => {
      const leftOrder =
        typeof left.startOrder === "number" && Number.isFinite(left.startOrder)
          ? left.startOrder
          : Number.MAX_SAFE_INTEGER;
      const rightOrder =
        typeof right.startOrder === "number" && Number.isFinite(right.startOrder)
          ? right.startOrder
          : Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return String(left.id ?? "").localeCompare(String(right.id ?? ""));
    });

    const normalizedGame = normalizeGameWithComputedTotals({
      ...game,
      players: orderedPlayers,
      totals: game.totals ?? {},
      rounds,
    });
    const normalizedTotals =
      normalizedGame.totals && typeof normalizedGame.totals === "object"
        ? normalizedGame.totals
        : {};
    const winnerLocalId = resolveWinnerId(normalizedGame as LocalGame);

    return {
      id: game.id,
      created_at:
        typeof game.createdAt === "number" && Number.isFinite(game.createdAt)
          ? new Date(game.createdAt).toISOString()
          : null,
      group_id: String(game.groupId ?? "").trim() || null,
      group_name_snapshot: String(game.groupName ?? "").trim() || null,
      winner_profile_id: (() => {
        const winnerPlayer =
          playersById.get(winnerLocalId) ?? localPlayersById.get(winnerLocalId);
        const winnerProfile = resolveProfile(normalizeName(winnerPlayer?.name));
        return winnerProfile?.id ?? null;
      })(),
      participants: orderedPlayers.map((player, index) => {
        const localPlayer =
          localPlayersById.get(String(player.id ?? "").trim()) ?? player;
        const normalizedName = normalizeName(localPlayer?.name ?? player.name);
        const profile = resolveProfile(normalizedName);
        const playerId = String(player.id ?? "").trim();
        const totals = normalizedTotals[playerId] ?? {};

        return {
          legacy_player_id: playerId || `legacy-player-${index}`,
          profile_id: profile?.id ?? null,
          player_name_snapshot:
            String(localPlayer?.name ?? player.name ?? "").trim() || "Unknown Player",
          color_snapshot:
            String(localPlayer?.color ?? player.color ?? "").trim() || null,
          assigned_card_art_index_snapshot:
            typeof (localPlayer?.assignedCardArtIndex ?? player.assignedCardArtIndex) ===
              "number"
              ? Number(
                  localPlayer?.assignedCardArtIndex ?? player.assignedCardArtIndex,
                )
              : null,
          start_order:
            typeof player.startOrder === "number" && Number.isFinite(player.startOrder)
              ? player.startOrder
              : index,
          total_prestige: toNumber(totals.totalPrestige ?? totals.prestige),
          direct_prestige: toNumber(totals.directPrestige),
          assist_prestige_received: toNumber(totals.assistPrestigeReceived),
          objective_prestige: toNumber(totals.objectivePrestige),
          score: toNumber(totals.score),
          assists: toNumber(totals.assists),
          failures: toNumber(totals.failures),
          contracts: toNumber(totals.contracts),
          is_winner: Boolean(playerId && playerId === winnerLocalId),
        };
      }),
      rounds: rounds.map((round, index) => ({
        legacy_player_id:
          String(round.playerId ?? "").trim() || `legacy-player-round-${index}`,
        round_index: index,
        prestige: toNumber(round.prestige),
        contracts: toNumber(round.contracts),
        failures: toNumber(round.failures),
        assist_recipients: toNumericRecord(round.assistRecipients),
        assist_prestige_recipients: toNumericRecord(
          round.assistPrestigeRecipients,
        ),
        objective_count: toNumber(round.objectiveCount),
        objective_prestige: toNumber(round.objectivePrestige),
        created_at:
          typeof round.createdAt === "number" && Number.isFinite(round.createdAt)
            ? new Date(round.createdAt).toISOString()
            : null,
      })),
    };
  });

  return { groups, games };
}
