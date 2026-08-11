import type { GameDraft, GameDraftGameplay, GameDraftPhase } from "@/lib/game-draft/types";

type GameDraftRow = {
  profile_id?: string | null;
  draft_id?: string | null;
  phase?: string | null;
  revision?: number | string | null;
  updated_at?: string | null;
  device_updated_at?: string | null;
  payload?: Record<string, unknown> | null;
};

const DRAFT_PHASES: GameDraftPhase[] = [
  "player_selection",
  "setup",
  "in_progress",
  "ready_to_finish",
];

function normalizeString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeNullableString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeNumber(value: unknown, fallback: number = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTimestamp(value: unknown, fallback: number = Date.now()) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePhase(value: unknown): GameDraftPhase {
  return DRAFT_PHASES.includes(value as GameDraftPhase)
    ? (value as GameDraftPhase)
    : "player_selection";
}

function normalizeGameplay(value: unknown): GameDraftGameplay | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const currentRecord =
    record.current && typeof record.current === "object" && !Array.isArray(record.current)
      ? (record.current as Record<string, unknown>)
      : {};

  return {
    turnIndex: normalizeNumber(record.turnIndex),
    rounds: Array.isArray(record.rounds) ? (record.rounds as GameDraftGameplay["rounds"]) : [],
    totals:
      record.totals && typeof record.totals === "object" && !Array.isArray(record.totals)
        ? (record.totals as GameDraftGameplay["totals"])
        : {},
    current: {
      prestige: normalizeNumber(currentRecord.prestige),
      contracts: normalizeNumber(currentRecord.contracts),
      failures: normalizeNumber(currentRecord.failures),
      assistRecipients:
        currentRecord.assistRecipients &&
        typeof currentRecord.assistRecipients === "object" &&
        !Array.isArray(currentRecord.assistRecipients)
          ? (currentRecord.assistRecipients as Record<string, number>)
          : {},
      assistPrestigeRecipients:
        currentRecord.assistPrestigeRecipients &&
        typeof currentRecord.assistPrestigeRecipients === "object" &&
        !Array.isArray(currentRecord.assistPrestigeRecipients)
          ? (currentRecord.assistPrestigeRecipients as Record<string, number>)
          : {},
      objectiveCount: normalizeNumber(currentRecord.objectiveCount),
      headToHeadFirstPlaceId: normalizeNullableString(currentRecord.headToHeadFirstPlaceId),
      headToHeadSecondPlaceId: normalizeNullableString(currentRecord.headToHeadSecondPlaceId),
    },
    roundCount: normalizeNumber(record.roundCount),
    selectedWinnerId: normalizeNullableString(record.selectedWinnerId),
  };
}

export function normalizeGameDraftRow(row: GameDraftRow | null): GameDraft | null {
  if (!row) {
    return null;
  }

  const payload =
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? row.payload
      : {};

  const profileId = normalizeString(row.profile_id);
  const draftId = normalizeString(row.draft_id);

  if (!profileId || !draftId) {
    return null;
  }

  const playerSnapshots = Array.isArray(payload.playerSnapshots)
    ? payload.playerSnapshots
        .map((snapshot) => {
          if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
            return null;
          }

          const record = snapshot as Record<string, unknown>;
          const id = normalizeString(record.id);
          const name = normalizeString(record.name);

          if (!id || !name) {
            return null;
          }

          return {
            id,
            name,
            initials: normalizeString(record.initials) || undefined,
            color: normalizeString(record.color) || undefined,
            assignedCardArtIndex:
              typeof record.assignedCardArtIndex === "number" &&
              Number.isFinite(record.assignedCardArtIndex)
                ? record.assignedCardArtIndex
                : null,
          };
        })
        .filter(Boolean)
    : [];

  return {
    profileId,
    draftId,
    phase: normalizePhase(row.phase),
    revision: normalizeNumber(row.revision),
    updatedAt: normalizeTimestamp(row.updated_at),
    deviceUpdatedAt: normalizeTimestamp(row.device_updated_at),
    selectedPlayerIds: Array.isArray(payload.selectedPlayerIds)
      ? payload.selectedPlayerIds
          .map((playerId) => normalizeString(playerId))
          .filter(Boolean)
      : [],
    selectedGroupId: normalizeNullableString(payload.selectedGroupId),
    selectedGroupName: normalizeNullableString(payload.selectedGroupName),
    turnOrder: Array.isArray(payload.turnOrder)
      ? payload.turnOrder
          .map((playerId) => normalizeString(playerId))
          .filter(Boolean)
      : [],
    playerSnapshots,
    gameplay: normalizeGameplay(payload.gameplay),
  };
}
