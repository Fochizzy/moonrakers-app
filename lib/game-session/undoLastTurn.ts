import { isPlayableTurnMetaType } from "@/utils/headToHeadMission";

import type { SessionRound } from "./gameSessionController";

type UndoLastTurnInput = {
  existingRounds: SessionRound[];
  /** Turn index the game is sitting on right now (whose turn is up next). */
  turnIndex: number;
  /** Player ids in seat order, used to hand the turn back to the right seat. */
  playerIds: string[];
};

export type UndoLastTurnCandidate = {
  /** The main round that would be removed. */
  removedRound: SessionRound;
  /** Bonus/head-to-head rounds attached to it that go with it. */
  removedLinkedRounds: SessionRound[];
  nextRounds: SessionRound[];
  /** Turn index to rewind to, so the undone player is up again. */
  nextTurnIndex: number;
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Builds the state that removing the most recently saved turn would produce.
 *
 * A saved turn is one main round plus any bonus-objective and head-to-head
 * placement rounds linked to it, so all of them are removed together — leaving
 * a linked round behind would keep awarding prestige for a turn that no longer
 * exists. Returns null when there is nothing to undo.
 */
export function buildUndoLastTurnCandidate(
  input: UndoLastTurnInput,
): UndoLastTurnCandidate | null {
  const playableRounds = input.existingRounds.filter((round) =>
    isPlayableTurnMetaType(round.metaType),
  );

  if (!playableRounds.length) {
    return null;
  }

  const removedRound = playableRounds[playableRounds.length - 1];
  if (!removedRound) {
    return null;
  }

  const removedLinkedRounds = input.existingRounds.filter(
    (round) => round.linkedTurnId === removedRound.id,
  );
  const nextRounds = input.existingRounds.filter(
    (round) => round.id !== removedRound.id && round.linkedTurnId !== removedRound.id,
  );

  const playerIds = Array.isArray(input.playerIds) ? input.playerIds : [];
  const playerCount = Math.max(1, playerIds.length);
  const currentIndex = Math.floor(toNumber(input.turnIndex));
  // Hand the turn back to the seat that played it. Fall back to stepping one
  // seat back (wrapping past the first seat) if that player has since left.
  const seatIndex = playerIds.indexOf(removedRound.playerId);
  const nextTurnIndex =
    seatIndex >= 0
      ? seatIndex
      : (((currentIndex - 1) % playerCount) + playerCount) % playerCount;

  return {
    removedRound,
    removedLinkedRounds,
    nextRounds,
    nextTurnIndex,
  };
}
