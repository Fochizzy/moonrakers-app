import type { GameLike, GroupLike, PlayerLike, PlayerTotals, SortMetric, Tab } from "./homeTypes";
import { normalizeId } from "@/utils/strings";

export { normalizeId };

export function asArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
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
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function normalizePlayer(raw: any, index: number): PlayerLike | null {
  if (!raw) return null;

  const id =
    normalizeId(raw.id) ||
    normalizeId(raw.playerId) ||
    normalizeId(raw.uuid) ||
    `player-${index}`;

  const name =
    normalizeName(raw.name) ||
    normalizeName(raw.playerName) ||
    normalizeName(raw.displayName) ||
    normalizeName(raw.label) ||
    `Player ${index + 1}`;

  return {
    ...raw,
    id,
    name,
    color: normalizeName(raw.color) || undefined,
    initials:
      normalizeName(raw.initials) || getInitials(name, `P${index + 1}`),
    assignedCardArtIndex:
      typeof raw.assignedCardArtIndex === "number" &&
      Number.isFinite(raw.assignedCardArtIndex)
        ? raw.assignedCardArtIndex
        : null,
  };
}

export function normalizeGroup(raw: any, index: number): GroupLike | null {
  if (!raw) return null;

  const id =
    normalizeId(raw.id) ||
    normalizeId(raw.groupId) ||
    normalizeId(raw.uuid) ||
    `group-${index}`;

  const name =
    normalizeName(raw.name) ||
    normalizeName(raw.groupName) ||
    normalizeName(raw.label) ||
    normalizeName(raw.title) ||
    `Group ${index + 1}`;

  const playerIdsRaw =
    raw.playerIds ??
    raw.players ??
    raw.memberIds ??
    raw.members ??
    raw.roster ??
    [];

  const playerIds = asArray(playerIdsRaw)
    .map((item: any) =>
      typeof item === "string"
        ? normalizeId(item)
        : normalizeId(item?.id ?? item?.playerId ?? item?.uuid)
    )
    .filter(Boolean);

  return {
    ...raw,
    id,
    name,
    playerIds,
    createdAt:
      typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : undefined,
    objectiveStatsEligible:
      typeof raw.objectiveStatsEligible === "boolean"
        ? raw.objectiveStatsEligible
        : undefined,
  };
}

export function normalizeGame(raw: any): GameLike | null {
  if (!raw || typeof raw !== "object") return null;

  const players = asArray(raw.players).map((p: any) => ({
    id: normalizeId(p?.id),
    playerId: normalizeId(p?.playerId),
    name: normalizeName(p?.name),
    color: normalizeName(p?.color) || undefined,
    initials: normalizeName(p?.initials) || undefined,
    assignedCardArtIndex:
      typeof p?.assignedCardArtIndex === "number" ? p.assignedCardArtIndex : null,
    score: n(p?.score),
    prestige: n(p?.prestige),
    totalPrestige: n(p?.totalPrestige),
    directPrestige: n(p?.directPrestige),
    assistPrestigeReceived: n(p?.assistPrestigeReceived),
  }));

  return {
    id: normalizeId(raw.id) || undefined,
    groupId: normalizeId(raw.groupId) || undefined,
    groupName: normalizeName(raw.groupName) || undefined,
    createdAt:
      typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
        ? raw.createdAt
        : undefined,
    winnerId: normalizeId(raw.winnerId) || undefined,
    selectedWinnerId: normalizeId(raw.selectedWinnerId) || undefined,
    manualWinnerId: normalizeId(raw.manualWinnerId) || undefined,
    totals: raw.totals,
    players,
  };
}

export function getGamePlayerIds(game: GameLike): string[] {
  return asArray(game.players)
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
