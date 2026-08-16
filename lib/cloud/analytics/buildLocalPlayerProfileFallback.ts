import {
  buildMoonrakersIntelProfile,
  type MoonrakersIntelProfile,
} from "@/utils/playerProfileMoonrakers";
import { buildHistoryOrdinalMap } from "@/lib/history/historyGameOrdering";
import { buildPlaystyleSamples } from "@/utils/playstyleEngine";
import type { Game, Player } from "@/utils/statsEngine";

type LocalProfilePlayer = Pick<
  Player,
  "id" | "name" | "color" | "assignedCardArtIndex"
>;
type LocalProfileGame = Game & {
  createdAt?: number | null;
};

type RecentGameRecord = Record<string, unknown>;

type BuildLocalPlayerProfileFallbackArgs = {
  playerId: string;
  opponentId?: string | null;
  players: LocalProfilePlayer[];
  games: LocalProfileGame[];
  recentGamesPayload?: RecentGameRecord[] | null;
  moonrakersIntelPayload?: MoonrakersIntelProfile | Record<string, unknown> | null;
};

export type LocalPlayerProfileFallback = {
  recentGames: RecentGameRecord[];
  moonrakersIntel: MoonrakersIntelProfile | Record<string, unknown>;
};

function normalizeId(value: unknown) {
  return String(value ?? "").trim();
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function toArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is RecentGameRecord =>
          Boolean(entry) && typeof entry === "object",
      )
    : [];
}

function resolveWinnerId(
  game: Partial<LocalProfileGame> | RecentGameRecord | null | undefined,
) {
  const record = asRecord(game);
  return normalizeId(
    record.winnerId ?? record.selectedWinnerId ?? record.manualWinnerId,
  );
}

function getGameParticipantIds(
  game: Partial<LocalProfileGame> | RecentGameRecord | null | undefined,
) {
  const record = asRecord(game);
  const fromPlayers = Array.isArray(record.players)
    ? record.players
        .map((player: unknown) => normalizeId(asRecord(player).id))
        .filter(Boolean)
    : [];

  if (fromPlayers.length > 0) {
    return fromPlayers;
  }

  const totals = record.totals;
  if (totals && typeof totals === "object" && !Array.isArray(totals)) {
    return Object.keys(totals).map(normalizeId).filter(Boolean);
  }

  return [];
}

function includesPlayer(
  game: Partial<LocalProfileGame> | RecentGameRecord | null | undefined,
  playerId: string,
) {
  const normalizedPlayerId = normalizeId(playerId);
  if (!normalizedPlayerId) return false;
  return getGameParticipantIds(game).includes(normalizedPlayerId);
}

function hasResolvedOutcome(
  game: Partial<LocalProfileGame> | RecentGameRecord | null | undefined,
) {
  return Boolean(resolveWinnerId(game));
}

function buildLocalRecentGameRecord(game: LocalProfileGame): RecentGameRecord {
  const winnerId = resolveWinnerId(game) || undefined;

  return {
    id: normalizeId(game?.id),
    gameId: normalizeId(game?.id),
    createdAt: game?.createdAt ?? null,
    winnerId,
    players: Array.isArray(game?.players) ? game.players : [],
  };
}

function getRecentGameKey(game: RecentGameRecord) {
  return normalizeId(game.id ?? game.gameId);
}

function getRecentGameTimestamp(game: RecentGameRecord) {
  const createdAt = game.createdAt ?? game.finishedAt ?? null;
  if (typeof createdAt === "number" && Number.isFinite(createdAt)) {
    return createdAt;
  }

  if (typeof createdAt === "string" && createdAt.trim()) {
    const parsed = Date.parse(createdAt);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function mergeRecentGames(
  payloadRecentGames: RecentGameRecord[],
  localRecentGames: RecentGameRecord[],
) {
  const mergedById = new Map<string, RecentGameRecord>();

  for (const game of payloadRecentGames) {
    const key = getRecentGameKey(game);
    if (!key) continue;
    mergedById.set(key, game);
  }

  for (const game of localRecentGames) {
    const key = getRecentGameKey(game);
    if (!key) continue;
    mergedById.set(key, game);
  }

  return Array.from(mergedById.values()).sort((left, right) => {
    const timestampDelta = getRecentGameTimestamp(right) - getRecentGameTimestamp(left);
    if (timestampDelta !== 0) {
      return timestampDelta;
    }

    return getRecentGameKey(right).localeCompare(getRecentGameKey(left));
  });
}

function hasMoonrakersIntelData(value: unknown) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as Record<string, unknown>).hasData === true,
  );
}

export function buildLocalPlayerProfileFallback({
  playerId,
  opponentId = null,
  players,
  games,
  recentGamesPayload = [],
  moonrakersIntelPayload = null,
}: BuildLocalPlayerProfileFallbackArgs): LocalPlayerProfileFallback {
  const normalizedPlayerId = normalizeId(playerId);
  const normalizedOpponentId = normalizeId(opponentId);
  const localGames = Array.isArray(games) ? games : [];
  const localPlayers = Array.isArray(players) ? players : [];

  const localRecentGames = localGames
    .filter((game) => {
      if (!includesPlayer(game, normalizedPlayerId) || !hasResolvedOutcome(game)) {
        return false;
      }

      if (!normalizedOpponentId) {
        return true;
      }

      return includesPlayer(game, normalizedOpponentId);
    })
    .map(buildLocalRecentGameRecord);
  const historyOrdinals = buildHistoryOrdinalMap(localGames, localPlayers);

  const filteredMoonrakersGames = localGames.filter(
    (game) =>
      includesPlayer(game, normalizedPlayerId) && hasResolvedOutcome(game),
  );
  const localMoonrakersIntel = buildMoonrakersIntelProfile({
    playerId: normalizedPlayerId,
    players: localPlayers,
    games: filteredMoonrakersGames,
    samples: buildPlaystyleSamples(localPlayers as Player[], filteredMoonrakersGames),
  });

  return {
    recentGames: mergeRecentGames(toArray(recentGamesPayload), localRecentGames).map(
      (game) => {
        const historyOrdinal = historyOrdinals.get(getRecentGameKey(game));
        return typeof historyOrdinal === "number"
          ? { ...game, historyOrdinal }
          : game;
      },
    ),
    moonrakersIntel:
      hasMoonrakersIntelData(moonrakersIntelPayload) || !localMoonrakersIntel.hasData
        ? moonrakersIntelPayload ?? localMoonrakersIntel
        : localMoonrakersIntel,
  };
}
