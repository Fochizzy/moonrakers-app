type RoundDetailValue = {
  prestige?: unknown;
  totalPrestige?: unknown;
  directPrestige?: unknown;
  assistPrestigeReceived?: unknown;
  objectivePrestige?: unknown;
};

type RoundDetailGame = {
  rounds?: RoundDetailValue[] | null;
  timeline?: RoundDetailValue[] | null;
  totals?: Record<string, RoundDetailValue> | null;
};

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function finalPrestige(value: RoundDetailValue) {
  if (typeof value.totalPrestige === "number") {
    return finiteNumber(value.totalPrestige);
  }

  if (typeof value.prestige === "number") {
    return finiteNumber(value.prestige);
  }

  return (
    finiteNumber(value.directPrestige) +
    finiteNumber(value.assistPrestigeReceived) +
    finiteNumber(value.objectivePrestige)
  );
}

/**
 * The April backup import preserved final totals and turn ordering, but the
 * source backup did not contain per-round prestige or assist detail. Those
 * games therefore have positive final prestige with zero prestige on every
 * round row. Later games have recorded round prestige, so this identifies the
 * eight affected imports without coupling the app to a hard-coded id list.
 */
export function hasMissingRoundByRoundDetail(
  game?: RoundDetailGame | null,
) {
  if (!game) return false;

  const rounds =
    Array.isArray(game.rounds) && game.rounds.length > 0
      ? game.rounds
      : Array.isArray(game.timeline)
        ? game.timeline
        : [];
  const hasFinalPrestige = Object.values(game.totals ?? {}).some(
    (value) => finalPrestige(value) > 0,
  );
  const hasRecordedRoundPrestige = rounds.some(
    (round) => Math.abs(finiteNumber(round.prestige)) > 0,
  );

  return hasFinalPrestige && !hasRecordedRoundPrestige;
}
