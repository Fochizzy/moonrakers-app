import type { GameLike, GamePlayer, GroupLike, PlayerLike, PlayerTotals, SortMetric, Tab } from "./homeTypes";
import { normalizeId } from "@/utils/strings";

export { normalizeId };

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

export function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeName(value: unknown): string {
  return String(value ?? "").trim();
}

export function getInitials(name?: string, fallback?: string) {
  const raw = String(name ?? fallback ?? "").trim();
  if (!raw) return "?";
  const parts = raw.split(/\s+/).filter(Boolean);
  const [first, second] = parts;
  if (first === undefined) return "?";
  if (second === undefined) return first.slice(0, 1).toUpperCase();
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
}

export function normalizePlayer(raw: unknown, index: number): PlayerLike | null {
  if (!raw) return null;

  const source = asRecord(raw);

  const id =
    normalizeId(source.id) ||
    normalizeId(source.playerId) ||
    normalizeId(source.uuid) ||
    `player-${index}`;

  const name =
    normalizeName(source.name) ||
    normalizeName(source.playerName) ||
    normalizeName(source.displayName) ||
    normalizeName(source.label) ||
    `Player ${index + 1}`;

  return {
    ...source,
    id,
    name,
    color: normalizeName(source.color) || undefined,
    initials:
      normalizeName(source.initials) || getInitials(name, `P${index + 1}`),
    assignedCardArtIndex:
      typeof source.assignedCardArtIndex === "number" &&
      Number.isFinite(source.assignedCardArtIndex)
        ? source.assignedCardArtIndex
        : null,
  };
}

export function normalizeGroup(raw: unknown, index: number): GroupLike | null {
  if (!raw) return null;

  const source = asRecord(raw);

  const id =
    normalizeId(source.id) ||
    normalizeId(source.groupId) ||
    normalizeId(source.uuid) ||
    `group-${index}`;

  const name =
    normalizeName(source.name) ||
    normalizeName(source.groupName) ||
    normalizeName(source.label) ||
    normalizeName(source.title) ||
    `Group ${index + 1}`;

  const playerIdsRaw =
    source.playerIds ??
    source.players ??
    source.memberIds ??
    source.members ??
    source.roster ??
    [];

  const playerIds = asArray(playerIdsRaw)
    .map((item) => {
      if (typeof item === "string") return normalizeId(item);
      const member = asRecord(item);
      return normalizeId(member.id ?? member.playerId ?? member.uuid);
    })
    .filter(Boolean);

  return {
    ...source,
    id,
    name,
    playerIds,
    createdAt:
      typeof source.createdAt === "number" && Number.isFinite(source.createdAt)
        ? source.createdAt
        : undefined,
    objectiveStatsEligible:
      typeof source.objectiveStatsEligible === "boolean"
        ? source.objectiveStatsEligible
        : undefined,
  };
}

export function normalizeGame(raw: unknown): GameLike | null {
  if (!raw || typeof raw !== "object") return null;

  const source = asRecord(raw);

  const players = asArray(source.players).map((rawPlayer) => {
    const p = asRecord(rawPlayer);

    return {
      id: normalizeId(p.id),
      playerId: normalizeId(p.playerId),
      name: normalizeName(p.name),
      color: normalizeName(p.color) || undefined,
      initials: normalizeName(p.initials) || undefined,
      assignedCardArtIndex:
        typeof p.assignedCardArtIndex === "number" ? p.assignedCardArtIndex : null,
      score: n(p.score),
      prestige: n(p.prestige),
      totalPrestige: n(p.totalPrestige),
      directPrestige: n(p.directPrestige),
      assistPrestigeReceived: n(p.assistPrestigeReceived),
    };
  });

  return {
    id: normalizeId(source.id) || undefined,
    groupId: normalizeId(source.groupId) || undefined,
    groupName: normalizeName(source.groupName) || undefined,
    createdAt:
      typeof source.createdAt === "number" && Number.isFinite(source.createdAt)
        ? source.createdAt
        : undefined,
    winnerId: normalizeId(source.winnerId) || undefined,
    selectedWinnerId: normalizeId(source.selectedWinnerId) || undefined,
    manualWinnerId: normalizeId(source.manualWinnerId) || undefined,
    totals: source.totals as GameLike["totals"],
    players,
  };
}

export function getGamePlayerIds(game: GameLike): string[] {
  return asArray<GamePlayer>(game.players)
    .map((p) => normalizeId(p.id ?? p.playerId))
    .filter(Boolean);
}

export function getWinnerId(game: GameLike): string {
  return normalizeId(game.manualWinnerId ?? game.selectedWinnerId ?? game.winnerId);
}

export function getTotalPrestigeFromTotals(totals?: PlayerTotals): number {
  const explicit = totals?.totalPrestige ?? totals?.prestige;
  if (Number.isFinite(Number(explicit))) return n(explicit);

  return (
    n(totals?.directPrestige) +
    n(totals?.assistPrestigeReceived) +
    n(totals?.objectivePrestige)
  );
}

export function sameIdSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const aSorted = [...a].sort();
  const bSorted = [...b].sort();
  return aSorted.every((id, index) => id === bSorted[index]);
}

export function sameOrderedIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

export function sortLabel(metric: SortMetric) {
  switch (metric) {
    case "elo": return "ELO";
    case "wins": return "Wins";
    case "games": return "Games";
    case "score": return "Score";
    case "prestige": return "Prestige";
    case "efficiency": return "Eff";
    case "avgPrestige": return "Avg";
    default: return metric;
  }
}

export function tabLabel(tab: Tab) {
  switch (tab) {
    case "game": return "Command";
    case "leaderboard": return "Data Center";
    case "hubs": return "Hubs";
    default: return tab;
  }
}
