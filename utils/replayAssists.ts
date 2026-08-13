import { isPlayableTurnMetaType } from "@/utils/headToHeadMission";
import { toNumber } from "@/utils/numbers";

export type ReplayAssistRoundLike = {
  playerId?: string;
  metaType?: string | null;
  assists?: number;
  assistPrestigeSent?: number;
  assistPrestigeReceived?: number;
  assistRecipients?: Record<string, unknown> | null;
  assistPrestigeRecipients?: Record<string, unknown> | null;
};

export type ReplayAssistShare = {
  playerId: string;
  prestige: number;
};

export type ReplayAssistSummary = {
  shares: ReplayAssistShare[];
  assistCount: number;
  assistPrestige: number;
};

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Resolves the players who assisted on a single turn and the prestige each of
 * them gained from it. Mirrors the crediting rules in engine/gameEngine
 * buildTotals: an entry counts when the actor flagged the assist or when the
 * turn awarded that player assist prestige.
 */
export function buildReplayAssistSummary(
  round?: ReplayAssistRoundLike | null,
): ReplayAssistSummary {
  const empty: ReplayAssistSummary = {
    shares: [],
    assistCount: 0,
    assistPrestige: 0,
  };

  if (!round) return empty;

  // Linked bonus/head-to-head entries never award assists.
  if (!isPlayableTurnMetaType(round.metaType)) return empty;

  const recipients = readRecord(round.assistRecipients);
  const prestigeRecipients = readRecord(round.assistPrestigeRecipients);
  const actorId = typeof round.playerId === "string" ? round.playerId : "";

  const shares: ReplayAssistShare[] = [];

  for (const playerId of new Set([
    ...Object.keys(recipients),
    ...Object.keys(prestigeRecipients),
  ])) {
    if (!playerId || playerId === actorId) continue;

    const assisted = toNumber(recipients[playerId]) > 0;
    const prestige = toNumber(prestigeRecipients[playerId]);

    if (!assisted && prestige === 0) continue;

    shares.push({ playerId, prestige });
  }

  shares.sort((left, right) => {
    if (right.prestige !== left.prestige) return right.prestige - left.prestige;
    return left.playerId.localeCompare(right.playerId);
  });

  if (shares.length > 0) {
    return {
      shares,
      assistCount: shares.length,
      assistPrestige: shares.reduce((sum, share) => sum + share.prestige, 0),
    };
  }

  // Imported or legacy turns can carry scalar totals without per-player maps.
  const legacyCount = Math.max(0, toNumber(round.assists));
  const legacyPrestige =
    toNumber(round.assistPrestigeSent) || toNumber(round.assistPrestigeReceived);

  if (legacyCount === 0 && legacyPrestige === 0) return empty;

  return {
    shares: [],
    assistCount: legacyCount,
    assistPrestige: legacyPrestige,
  };
}

export type ReplayAssistSnapshotEntry = {
  assists?: number;
  assistPrestigeReceived?: number;
  assistPrestigeBySource?: Record<string, unknown> | null;
  assistCountBySource?: Record<string, unknown> | null;
};

export type ReplayAssistSnapshot = Record<string, unknown> & {
  players?: Record<string, unknown> | null;
};

export type ReplayAssistLedgerEntry = {
  /** The player who assisted and gained the prestige. */
  helperId: string;
  /** The player whose turn was assisted. */
  actorId: string;
  prestige: number;
  assists: number;
};

export type ReplayAssistHelperTotals = {
  prestige: number;
  assists: number;
  partners: Array<{ actorId: string; prestige: number; assists: number }>;
};

/**
 * Reads a single player's entry from a replay snapshot, tolerating both the
 * flat `{ [playerId]: entry }` and nested `{ players: { [playerId]: entry } }`
 * shapes that replay payloads use.
 */
export function getReplaySnapshotEntry(
  snapshot: ReplayAssistSnapshot | null | undefined,
  playerId: string,
): ReplayAssistSnapshotEntry | undefined {
  if (!snapshot || typeof snapshot !== "object") return undefined;

  const direct = snapshot[playerId];
  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    return direct as ReplayAssistSnapshotEntry;
  }

  const nested = readRecord(snapshot.players)[playerId];
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as ReplayAssistSnapshotEntry;
  }

  return undefined;
}

/**
 * Resolves the assists that happened between two cumulative replay snapshots:
 * who assisted whom, and how much prestige the assisting player gained for it.
 * Reads the `assistPrestigeBySource` / `assistCountBySource` maps that
 * engine/gameEngine buildTotals records on each player's totals, where the
 * source key is the player whose turn was assisted.
 */
export function buildReplayAssistLedger(args: {
  playerIds: readonly string[];
  snapshot?: ReplayAssistSnapshot | null;
  previousSnapshot?: ReplayAssistSnapshot | null;
}): ReplayAssistLedgerEntry[] {
  const { playerIds, snapshot, previousSnapshot } = args;
  const ledger: ReplayAssistLedgerEntry[] = [];

  for (const helperId of playerIds ?? []) {
    if (!helperId) continue;

    const current = getReplaySnapshotEntry(snapshot, helperId);
    const previous = getReplaySnapshotEntry(previousSnapshot, helperId);

    const currentPrestige = readRecord(current?.assistPrestigeBySource);
    const previousPrestige = readRecord(previous?.assistPrestigeBySource);
    const currentCounts = readRecord(current?.assistCountBySource);
    const previousCounts = readRecord(previous?.assistCountBySource);

    for (const actorId of new Set([
      ...Object.keys(currentPrestige),
      ...Object.keys(currentCounts),
    ])) {
      if (!actorId || actorId === helperId) continue;

      const prestige =
        toNumber(currentPrestige[actorId]) - toNumber(previousPrestige[actorId]);
      const assists =
        toNumber(currentCounts[actorId]) - toNumber(previousCounts[actorId]);

      if (prestige === 0 && assists <= 0) continue;

      ledger.push({
        helperId,
        actorId,
        prestige,
        assists: Math.max(0, assists),
      });
    }
  }

  ledger.sort((left, right) => {
    if (right.prestige !== left.prestige) return right.prestige - left.prestige;
    if (right.assists !== left.assists) return right.assists - left.assists;
    if (left.helperId !== right.helperId) {
      return left.helperId.localeCompare(right.helperId);
    }
    return left.actorId.localeCompare(right.actorId);
  });

  return ledger;
}

/** Rolls a ledger up per assisting player, keeping the ledger's ordering. */
export function groupReplayAssistLedgerByHelper(
  ledger: readonly ReplayAssistLedgerEntry[],
): Record<string, ReplayAssistHelperTotals> {
  const grouped: Record<string, ReplayAssistHelperTotals> = {};

  for (const entry of ledger ?? []) {
    const totals = grouped[entry.helperId] ?? {
      prestige: 0,
      assists: 0,
      partners: [],
    };

    totals.prestige += entry.prestige;
    totals.assists += entry.assists;
    totals.partners.push({
      actorId: entry.actorId,
      prestige: entry.prestige,
      assists: entry.assists,
    });

    grouped[entry.helperId] = totals;
  }

  return grouped;
}

export default buildReplayAssistSummary;
