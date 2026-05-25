import {
  canonicalizeGames,
  collectUnifiedGames,
  type FlexibleStore,
  type NormalizedGame,
  type StorePlayer,
} from "./charts";
import { resolveAllGamesToPlayers } from "./importedGameResolver";
import { canonicalizeSelectablePlayers } from "./registeredProfilePlayer";

type AnalyticsGroupLike = {
  id?: string;
  name?: string;
  playerIds?: string[];
};

type AnalyticsDirectoryInput = FlexibleStore & {
  players?: StorePlayer[];
  groups?: AnalyticsGroupLike[];
};

export type AnalyticsPlayerDirectory = {
  players: StorePlayer[];
  games: NormalizedGame[];
  aliases: Record<string, string>;
};

function normalizeId(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeName(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLooseName(value: unknown) {
  return normalizeName(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ");
}

function getInitials(name?: string) {
  const normalized = normalizeName(name);
  if (!normalized) {
    return "?";
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function mergeAnalyticsPlayer(
  resolvedPlayer: StorePlayer,
  rosterPlayer: StorePlayer | null,
): StorePlayer {
  const resolvedName = normalizeName(resolvedPlayer?.name) || "Player";
  const rosterName = normalizeName(rosterPlayer?.name);
  const resolvedId = normalizeId(resolvedPlayer?.id);

  return {
    ...resolvedPlayer,
    ...rosterPlayer,
    id: resolvedId,
    name: resolvedName || rosterName || "Player",
    initials:
      normalizeName(resolvedPlayer?.initials) ||
      normalizeName(rosterPlayer?.initials) ||
      getInitials(resolvedName || rosterName || "Player"),
    color:
      normalizeName(rosterPlayer?.color) ||
      normalizeName(resolvedPlayer?.color) ||
      undefined,
    assignedCardArtIndex:
      typeof rosterPlayer?.assignedCardArtIndex === "number" &&
      Number.isFinite(rosterPlayer.assignedCardArtIndex)
        ? rosterPlayer.assignedCardArtIndex
        : typeof resolvedPlayer?.assignedCardArtIndex === "number" &&
            Number.isFinite(resolvedPlayer.assignedCardArtIndex)
          ? resolvedPlayer.assignedCardArtIndex
          : null,
  };
}

export function canonicalizeAnalyticsPlayerId(
  playerId: string | null | undefined,
  aliases: Record<string, string>,
) {
  const normalized = normalizeId(playerId);
  if (!normalized) {
    return null;
  }

  return normalizeId(aliases[normalized] ?? normalized) || null;
}

export function canonicalizeAnalyticsPlayerIds(
  playerIds: Array<string | null | undefined>,
  aliases: Record<string, string>,
) {
  const seen = new Set<string>();
  const canonicalIds: string[] = [];

  for (const playerId of Array.isArray(playerIds) ? playerIds : []) {
    const canonicalId = canonicalizeAnalyticsPlayerId(playerId, aliases);
    if (!canonicalId || seen.has(canonicalId)) {
      continue;
    }

    seen.add(canonicalId);
    canonicalIds.push(canonicalId);
  }

  return canonicalIds;
}

export function buildAnalyticsPlayerDirectory(
  input: AnalyticsDirectoryInput,
): AnalyticsPlayerDirectory {
  const rosterPlayers = Array.isArray(input?.players) ? input.players : [];
  const rosterGroups = Array.isArray(input?.groups) ? input.groups : [];
  const canonicalRoster = canonicalizeSelectablePlayers(rosterPlayers, rosterGroups);
  const unifiedGames = canonicalizeGames(
    collectUnifiedGames(input),
    canonicalRoster.players as StorePlayer[],
  );

  if (!unifiedGames.length) {
    return {
      players: canonicalRoster.players as StorePlayer[],
      games: unifiedGames,
      aliases: canonicalRoster.aliases,
    };
  }

  const resolvedPlayers = resolveAllGamesToPlayers(unifiedGames as any) as StorePlayer[];
  if (!resolvedPlayers.length) {
    return {
      players: canonicalRoster.players as StorePlayer[],
      games: unifiedGames,
      aliases: canonicalRoster.aliases,
    };
  }

  const rosterById = new Map<string, StorePlayer>();
  const rosterByName = new Map<string, StorePlayer>();

  for (const rosterPlayer of canonicalRoster.players as StorePlayer[]) {
    const rosterId = normalizeId(rosterPlayer?.id);
    const rosterNameKey = normalizeLooseName(rosterPlayer?.name);

    if (rosterId) {
      rosterById.set(rosterId, rosterPlayer);
    }

    if (rosterNameKey && !rosterByName.has(rosterNameKey)) {
      rosterByName.set(rosterNameKey, rosterPlayer);
    }
  }

  return {
    players: [...resolvedPlayers]
      .map((resolvedPlayer) => {
        const resolvedId = normalizeId(resolvedPlayer?.id);
        const resolvedNameKey = normalizeLooseName(resolvedPlayer?.name);
        const rosterPlayer =
          rosterById.get(resolvedId) ??
          (resolvedNameKey ? rosterByName.get(resolvedNameKey) ?? null : null);

        return mergeAnalyticsPlayer(resolvedPlayer, rosterPlayer);
      })
      .sort((left, right) =>
        normalizeName(left?.name).localeCompare(normalizeName(right?.name)),
      ),
    games: unifiedGames,
    aliases: canonicalRoster.aliases,
  };
}
