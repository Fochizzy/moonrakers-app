import { useMemo } from "react";
import { useRouter } from "expo-router";
import { resolveAnalyticsRecoveryState } from "./analyticsRecoveryState";
import { APP_ROUTES, buildHistoryRoute, buildHomeRoute } from "./appRoutes";

type UseAnalyticsRecoveryOptions = {
  loading: boolean;
  error: string | null;
  playersCount: number;
  gamesCount: number;
  playerOptionsCount?: number;
  hasLeagueData?: boolean;
  selectedPlayerHasDetail?: boolean;
  context?: "hub" | "leaderboard" | "stats" | "charts" | "insights";
};

type RecoveryAction = { label: string; onPress: () => void; variant?: "secondary" };

type UseAnalyticsRecoveryResult = {
  recoveryState: ReturnType<typeof resolveAnalyticsRecoveryState>;
  sectionState: "loading" | "error" | "empty" | "ready";
  messageTitle: string;
  messageBody: string;
  primaryAction: RecoveryAction | null;
  secondaryAction: (RecoveryAction & { variant: "secondary" }) | null;
};

export function useAnalyticsRecovery(
  options: UseAnalyticsRecoveryOptions
): UseAnalyticsRecoveryResult {
  const router = useRouter();
  const { loading, error, playersCount, gamesCount, playerOptionsCount, hasLeagueData, selectedPlayerHasDetail, context = "hub" } = options;

  const recoveryState = useMemo(
    () =>
      resolveAnalyticsRecoveryState({
        loading,
        error,
        playersCount,
        gamesCount,
        playerOptionsCount,
        hasLeagueData,
        selectedPlayerHasDetail,
      }),
    [loading, error, playersCount, gamesCount, playerOptionsCount, hasLeagueData, selectedPlayerHasDetail]
  );

  const sectionState = useMemo<"loading" | "error" | "empty" | "ready">(() => {
    if (loading) return "loading";
    if (error) return "error";
    if (recoveryState.kind === "no-players" || recoveryState.kind === "no-games") return "empty";
    return "ready";
  }, [loading, error, recoveryState.kind]);

  const messageTitle = useMemo(() => {
    if (recoveryState.kind === "no-players") return "No tracked players yet";
    if (recoveryState.kind === "no-games") return "No tracked games yet";
    if (error) return context === "leaderboard" ? "Leaderboard unavailable" : "Analytics unavailable";
    return context === "leaderboard" ? "No leaderboard data yet" : "Analytics Destinations";
  }, [recoveryState.kind, error, context]);

  const messageBody = useMemo(() => {
    if (recoveryState.kind === "no-players")
      return "Set up your roster first so the analytics surfaces have real commanders to work with.";
    if (recoveryState.kind === "no-games")
      return context === "leaderboard"
        ? "Track a few games before expecting the shared ELO leaderboard to populate."
        : "Your roster is ready, but you need mission history before the analytics hub can populate.";
    if (error) return error;
    return context === "leaderboard"
      ? "Supabase has not published any leaderboard rows for this account yet."
      : "Syncing the analytics hub surface from the published Supabase payload.";
  }, [recoveryState.kind, error, context]);

  const primaryAction = useMemo<RecoveryAction | null>(() => {
    if (recoveryState.kind === "no-players")
      return { label: "Open roster", onPress: () => router.push(APP_ROUTES.roster) };
    if (recoveryState.kind === "no-games")
      return { label: "Start tracked game", onPress: () => router.push(buildHomeRoute("game")) };
    return null;
  }, [recoveryState.kind, router]);

  const secondaryAction = useMemo<(RecoveryAction & { variant: "secondary" }) | null>(() => {
    if (recoveryState.kind === "no-players")
      return { label: "Profiles", variant: "secondary", onPress: () => router.push(APP_ROUTES.playerDirectory) };
    if (recoveryState.kind === "no-games")
      return { label: "Import backup", variant: "secondary", onPress: () => router.push(buildHistoryRoute({ intent: "import" })) };
    return null;
  }, [recoveryState.kind, router]);

  return { recoveryState, sectionState, messageTitle, messageBody, primaryAction, secondaryAction };
}
