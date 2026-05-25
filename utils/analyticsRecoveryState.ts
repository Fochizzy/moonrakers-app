export type AnalyticsRecoveryKind = "none" | "no-players" | "no-games" | "player-empty";

export type AnalyticsRecoveryState = {
  kind: AnalyticsRecoveryKind;
};

type ResolveAnalyticsRecoveryStateInput = {
  loading: boolean;
  error: string | null;
  playersCount: number;
  gamesCount: number;
  playerOptionsCount?: number;
  hasLeagueData?: boolean;
  selectedPlayerHasDetail?: boolean;
};

function normalizeCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function resolveAnalyticsRecoveryState(
  input: ResolveAnalyticsRecoveryStateInput,
): AnalyticsRecoveryState {
  if (input.loading || input.error) {
    return { kind: "none" };
  }

  if (normalizeCount(input.playersCount) < 1) {
    return { kind: "no-players" };
  }

  if (normalizeCount(input.gamesCount) < 1) {
    return { kind: "no-games" };
  }

  if (
    normalizeCount(input.playerOptionsCount) > 0 &&
    input.hasLeagueData &&
    input.selectedPlayerHasDetail === false
  ) {
    return { kind: "player-empty" };
  }

  return { kind: "none" };
}
