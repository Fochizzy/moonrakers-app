import {
  buildTotals,
  type PlayerLike,
  type PlayerTotals,
  type Round,
} from "@/engine/gameEngine";
import { isLinkedTurnMetaType } from "@/utils/headToHeadMission";
import { toNumber } from "@/utils/numbers";

export type ReplayTimelineRound = {
  id?: string;
  playerId?: string;
  prestige?: number;
  contracts?: number;
  failures?: number;
  assistRecipients?: Record<string, number> | null;
  assistPrestigeRecipients?: Record<string, number> | null;
  objectiveCount?: number;
  objectivePrestige?: number;
  createdAt?: number;
  metaType?: Round["metaType"];
  linkedTurnId?: string;
  headToHeadScoreBonus?: number;
};

export type ReplayTimelineStep = {
  round: number;
  snapshot: Record<string, PlayerTotals>;
};

function readRecord(value: unknown): Record<string, number> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, number>)
    : {};
}

function toEngineRound(round: ReplayTimelineRound, index: number): Round {
  const objectiveCount = Math.max(
    0,
    Math.floor(toNumber(round.objectiveCount ?? round.objectivePrestige)),
  );

  return {
    id: round.id ?? `replay-round-${index}`,
    playerId: String(round.playerId),
    prestige: toNumber(round.prestige),
    contracts: toNumber(round.contracts),
    failures: toNumber(round.failures),
    assistRecipients: readRecord(round.assistRecipients),
    assistPrestigeRecipients: readRecord(round.assistPrestigeRecipients),
    objectiveCount,
    objectivePrestige: objectiveCount,
    createdAt: toNumber(round.createdAt),
    metaType: round.metaType,
    linkedTurnId: round.linkedTurnId,
    headToHeadScoreBonus: toNumber(round.headToHeadScoreBonus),
  };
}

/**
 * Turns a saved game's rounds into the cumulative per-round snapshots the
 * replay stepper consumes. Each step holds the standings as of that turn,
 * including the assist attribution maps engine buildTotals records, so the
 * replay can name who assisted whom and what they gained.
 *
 * Linked entries (bonus objective, head-to-head placements) are folded into
 * the turn they attach to rather than becoming steps of their own.
 */
export function buildReplayTimeline(
  rounds: readonly ReplayTimelineRound[] | null | undefined,
  players: readonly PlayerLike[] | null | undefined,
): ReplayTimelineStep[] {
  const safePlayers = Array.isArray(players) ? [...players] : [];
  const safeRounds = Array.isArray(rounds) ? rounds : [];

  if (!safeRounds.length || !safePlayers.length) return [];

  const steps: ReplayTimelineStep[] = [];
  const consumed: Round[] = [];

  for (let index = 0; index < safeRounds.length; index += 1) {
    const round = safeRounds[index];
    if (!round || typeof round.playerId !== "string" || !round.playerId) {
      continue;
    }

    consumed.push(toEngineRound(round, index));
    const snapshot = buildTotals([...consumed], safePlayers);

    const previousStep = steps[steps.length - 1];
    if (isLinkedTurnMetaType(round.metaType) && previousStep) {
      previousStep.snapshot = snapshot;
      continue;
    }

    steps.push({ round: steps.length + 1, snapshot });
  }

  return steps;
}

export default buildReplayTimeline;
