import React, { useMemo } from "react";
import RelationshipGraph from "@/components/charts/RelationshipGraph";

type Player = { id: string; name?: string; color?: string };
type SnapshotValue = number | string | boolean | null | undefined | Record<string, unknown>;
type SnapshotPoint = { round?: number; gameIndex?: number; label?: string; snapshot?: Record<string, SnapshotValue> };
type Relationships = Record<string, Record<string, number>>;
type Props = { data?: SnapshotPoint[]; players?: Player[]; relationships?: Relationships; scopedPlayerIds?: string[]; mode?: "flow" | "network"; title?: string; subtitle?: string };
function toNumber(value: unknown): number { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function getSnapshotEntry(point: SnapshotPoint | undefined, playerId: string): Record<string, unknown> | undefined {
  const snapshot = point?.snapshot;
  if (!snapshot || typeof snapshot !== "object") return undefined;
  const direct = snapshot[playerId];
  if (direct && typeof direct === "object" && !Array.isArray(direct)) return direct as Record<string, unknown>;
  const nestedPlayers = (snapshot as Record<string, unknown>).players;
  if (nestedPlayers && typeof nestedPlayers === "object" && !Array.isArray(nestedPlayers)) {
    const nested = (nestedPlayers as Record<string, unknown>)[playerId];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) return nested as Record<string, unknown>;
  }
  return undefined;
}
function getAssistOutMap(entry?: Record<string, unknown>): Record<string, number> {
  const candidates = [entry?.assistPrestigeByTarget, entry?.assistPrestigeByRecipient, entry?.assistByTarget, entry?.assistCountByTarget, entry?.assistRecipients, entry?.assistCountByRecipient];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const result: Record<string, number> = {};
      Object.entries(candidate).forEach(([key, value]) => { result[key] = toNumber(value); });
      return result;
    }
  }
  return {};
}
function buildRelationshipsFromSnapshots(data: SnapshotPoint[], players: Player[]): Relationships {
  const relationships: Relationships = {};
  for (const player of players) relationships[player.id] = {};
  for (const point of data) {
    for (const player of players) {
      const entry = getSnapshotEntry(point, player.id); if (!entry) continue;
      const outMap = getAssistOutMap(entry);
      for (const [targetId, rawValue] of Object.entries(outMap)) {
        if (!targetId || targetId === player.id) continue;
        const value = toNumber(rawValue); if (value <= 0) continue;
        if (!relationships[player.id]) relationships[player.id] = {};
        relationships[player.id][targetId] = toNumber(relationships[player.id][targetId]) + value;
      }
    }
  }
  return relationships;
}
export default function AssistNetworkOverview({ data = [], players = [], relationships, scopedPlayerIds, mode = "network", title = "Assist Network", subtitle = "Metric-driven support network on the unified relationship graph." }: Props) {
  const safePlayers = Array.isArray(players) ? players : [];
  const safeRelationships = useMemo(() => relationships && typeof relationships === "object" ? relationships : buildRelationshipsFromSnapshots(Array.isArray(data) ? data : [], safePlayers), [relationships, data, safePlayers]);
  return <RelationshipGraph players={safePlayers as any} relationships={safeRelationships} scopedPlayerIds={scopedPlayerIds} variant="assist_network" mode={mode} title={title} subtitle={subtitle} />;
}

