export const HEAD_TO_HEAD_CURRENT_TURN_FIRST_PLACE_SCORE_BONUS = 5;
export const HEAD_TO_HEAD_OTHER_PLAYER_FIRST_PLACE_SCORE_BONUS = 3;
export const HEAD_TO_HEAD_SECOND_PLACE_SCORE_BONUS = 2;

export type HeadToHeadRoundMetaType =
  | "main"
  | "bonusObjective"
  | "headToHeadFirstPlace"
  | "headToHeadSecondPlace";

export function isLinkedTurnMetaType(
  metaType: string | null | undefined,
) {
  return (
    metaType === "bonusObjective" ||
    metaType === "headToHeadFirstPlace" ||
    metaType === "headToHeadSecondPlace"
  );
}

export function isPlayableTurnMetaType(
  metaType: string | null | undefined,
) {
  return !metaType || metaType === "main";
}

export function sanitizeHeadToHeadSelection(
  firstPlaceId: unknown,
  secondPlaceId: unknown,
) {
  const normalizedFirstPlaceId = String(firstPlaceId ?? "").trim();
  const normalizedSecondPlaceId = String(secondPlaceId ?? "").trim();

  if (!normalizedFirstPlaceId || !normalizedSecondPlaceId) {
    return {
      firstPlaceId: null,
      secondPlaceId: null,
    } as const;
  }

  if (normalizedFirstPlaceId === normalizedSecondPlaceId) {
    return {
      firstPlaceId: normalizedFirstPlaceId,
      secondPlaceId: null,
    } as const;
  }

  return {
    firstPlaceId: normalizedFirstPlaceId,
    secondPlaceId: normalizedSecondPlaceId,
  } as const;
}

export function hasHeadToHeadSelection(input: {
  headToHeadFirstPlaceId?: unknown;
  headToHeadSecondPlaceId?: unknown;
}) {
  const { firstPlaceId, secondPlaceId } = sanitizeHeadToHeadSelection(
    input?.headToHeadFirstPlaceId,
    input?.headToHeadSecondPlaceId,
  );

  return Boolean(firstPlaceId && secondPlaceId);
}
