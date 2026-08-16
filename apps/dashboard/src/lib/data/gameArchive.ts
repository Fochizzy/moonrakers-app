import type {
  ArchiveGame,
  ArchiveGamePlayer,
  ArchiveGroup,
  ArchivePlayer,
  ArchivePlayerTotals,
  ArchiveRound,
  GameArchive,
} from "./gameArchiveTypes";

type LooseRecord = Record<string, unknown>;

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as LooseRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toText(value: unknown) {
  return String(value ?? "").trim();
}

function toOptionalText(value: unknown) {
  const text = toText(value);
  return text.length > 0 ? text : null;
}

function toOptionalIndex(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toNumericRecord(value: unknown): Record<string, number> {
  return Object.fromEntries(
    Object.entries(asRecord(value)).map(([key, entry]) => [
      String(key),
      toNumber(entry),
    ]),
  );
}

function toArchiveTotals(value: unknown): ArchivePlayerTotals {
  const totals = asRecord(value);

  return {
    assistPrestigeBySource: toNumericRecord(totals.assistPrestigeBySource),
    assistPrestigeReceived: toNumber(totals.assistPrestigeReceived),
    assistPrestigeSent: toNumber(totals.assistPrestigeSent),
    assists: toNumber(totals.assists),
    contracts: toNumber(totals.contracts),
    directPrestige: toNumber(totals.directPrestige),
    efficiency: toNumber(totals.efficiency),
    failures: toNumber(totals.failures),
    objectiveCount: toNumber(totals.objectiveCount),
    objectivePrestige: toNumber(totals.objectivePrestige),
    performance: toNumber(totals.performance),
    score: toNumber(totals.score),
    totalPrestige: toNumber(totals.totalPrestige ?? totals.prestige),
  };
}

/**
 * The snapshot keeps both the table name and the handle. ELO, insights, and the
 * player directory all publish the handle, so the archive follows suit rather
 * than showing the same person as "Izzy" here and "Fochizzy" one page over.
 */
function toDisplayName(player: LooseRecord, fallback: string) {
  return toText(player.displayName) || toText(player.name) || fallback;
}

function toArchiveGamePlayer(value: unknown, index: number): ArchiveGamePlayer {
  const player = asRecord(value);
  const startOrder = player.startOrder;

  return {
    assignedCardArtIndex: toOptionalIndex(player.assignedCardArtIndex),
    color: toOptionalText(player.color),
    id: toText(player.id),
    name: toDisplayName(player, `Player ${index + 1}`),
    startOrder:
      typeof startOrder === "number" && Number.isFinite(startOrder)
        ? startOrder
        : index,
  };
}

function toArchiveRound(value: unknown, index: number): ArchiveRound {
  const round = asRecord(value);

  return {
    assistPrestigeRecipients: toNumericRecord(round.assistPrestigeRecipients),
    assistRecipients: toNumericRecord(round.assistRecipients),
    contracts: toNumber(round.contracts),
    createdAt: toNumber(round.createdAt),
    failures: toNumber(round.failures),
    id: toText(round.id) || `round-${index}`,
    objectiveCount: toNumber(round.objectiveCount),
    objectivePrestige: toNumber(round.objectivePrestige),
    playerId: toText(round.playerId),
    prestige: toNumber(round.prestige),
  };
}

export function toArchiveGame(value: unknown): ArchiveGame | null {
  const game = asRecord(value);
  const id = toText(game.id);

  if (!id) {
    return null;
  }

  const players = asArray(game.players).map(toArchiveGamePlayer);
  const rounds = asArray(game.rounds).map(toArchiveRound);
  const totals = Object.fromEntries(
    Object.entries(asRecord(game.totals)).map(([playerId, entry]) => [
      String(playerId),
      toArchiveTotals(entry),
    ]),
  );
  const roundCount = game.roundCount;

  return {
    createdAt: toNumber(game.createdAt),
    groupId: toOptionalText(game.groupId),
    groupName: toOptionalText(game.groupName),
    hostProfileId: toOptionalText(game.hostProfileId),
    id,
    players,
    roundCount:
      typeof roundCount === "number" && Number.isFinite(roundCount)
        ? roundCount
        : rounds.length,
    rounds,
    totals,
    winnerId:
      toOptionalText(game.winnerId) ??
      toOptionalText(game.selectedWinnerId) ??
      toOptionalText(game.manualWinnerId),
  };
}

function toArchivePlayer(value: unknown): ArchivePlayer | null {
  const player = asRecord(value);
  const id = toText(player.id);

  if (!id) {
    return null;
  }

  return {
    assignedCardArtIndex: toOptionalIndex(player.assignedCardArtIndex),
    color: toOptionalText(player.color),
    id,
    name: toDisplayName(player, "Player"),
  };
}

function toArchiveGroup(value: unknown): ArchiveGroup | null {
  const group = asRecord(value);
  const id = toText(group.id);

  if (!id) {
    return null;
  }

  return {
    createdAt: toNumber(group.createdAt),
    id,
    name: toText(group.name) || "Group",
    playerIds: asArray(group.playerIds).map(toText).filter(Boolean),
  };
}

function isPresent<TValue>(value: TValue | null): value is TValue {
  return value !== null;
}

/**
 * Convert a normalized cloud snapshot into the plain, serializable shapes the
 * dashboard server components hand to client views.
 */
export function toGameArchive(snapshot: {
  games?: unknown;
  groups?: unknown;
  players?: unknown;
}): GameArchive {
  const games = asArray(snapshot.games)
    .map(toArchiveGame)
    .filter(isPresent)
    .sort((left, right) => right.createdAt - left.createdAt);

  const players = asArray(snapshot.players)
    .map(toArchivePlayer)
    .filter(isPresent)
    .sort((left, right) => left.name.localeCompare(right.name));

  const groups = asArray(snapshot.groups)
    .map(toArchiveGroup)
    .filter(isPresent)
    .sort((left, right) => left.name.localeCompare(right.name));

  return { games, groups, players };
}
