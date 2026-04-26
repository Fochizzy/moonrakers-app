import { buildNodeStats } from "./relationshipGraph.utils";

type SimplePlayer = {
  id: string;
  name?: string | null;
  color?: string | null;
};

type Relationships = Record<string, Record<string, number>>;

export type RelationshipInsightEntry = {
  player: SimplePlayer;
  value: number;
};

export type RelationshipInsightLink = {
  from: SimplePlayer;
  to: SimplePlayer;
  value: number;
};

export type RelationshipInsightModel = {
  hub: RelationshipInsightEntry | null;
  netGiver: RelationshipInsightEntry | null;
  netReceiver: RelationshipInsightEntry | null;
  strongestLink: RelationshipInsightLink | null;
};

function playerName(player?: SimplePlayer | null) {
  return String(player?.name || "Unknown").trim() || "Unknown";
}

export function buildRelationshipInsightModel(
  players: readonly SimplePlayer[] = [],
  relationships: Relationships = {}
): RelationshipInsightModel {
  const safePlayers = [...players];
  const playerById = new Map(
    safePlayers.map((player) => [String(player.id), player])
  );
  const stats = buildNodeStats(
    safePlayers.map((player) => ({
      id: String(player.id),
      name: playerName(player),
      color: player.color ?? undefined,
    })),
    relationships
  );

  const ranked = safePlayers.map((player) => {
    const stat = stats.get(String(player.id));
    return {
      player,
      involvement: stat?.involvement ?? 0,
      supportBalance: stat?.supportBalance ?? 0,
    };
  });

  const hub =
    [...ranked].sort((left, right) => {
      return (
        right.involvement - left.involvement ||
        playerName(left.player).localeCompare(playerName(right.player))
      );
    })[0] ?? null;

  const netGiver =
    [...ranked].sort((left, right) => {
      return (
        left.supportBalance - right.supportBalance ||
        right.involvement - left.involvement
      );
    })[0] ?? null;

  const netReceiver =
    [...ranked].sort((left, right) => {
      return (
        right.supportBalance - left.supportBalance ||
        right.involvement - left.involvement
      );
    })[0] ?? null;

  let strongestLink: RelationshipInsightLink | null = null;

  Object.entries(relationships ?? {}).forEach(([fromId, nested]) => {
    Object.entries(nested ?? {}).forEach(([toId, rawValue]) => {
      const value = Number(rawValue) || 0;
      if (value <= 0) return;

      const from = playerById.get(String(fromId));
      const to = playerById.get(String(toId));
      if (!from || !to) return;

      if (!strongestLink || value > strongestLink.value) {
        strongestLink = { from, to, value };
      }
    });
  });

  return {
    hub: hub ? { player: hub.player, value: hub.involvement } : null,
    netGiver: netGiver ? { player: netGiver.player, value: netGiver.supportBalance } : null,
    netReceiver: netReceiver
      ? { player: netReceiver.player, value: netReceiver.supportBalance }
      : null,
    strongestLink,
  };
}
