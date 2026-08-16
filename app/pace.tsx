import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import ActionButton from "@/components/ui/ActionButton";
import AppHeader from "@/components/ui/AppHeader";
import EmptyStateCard from "@/components/ui/EmptyStateCard";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import { getPaceScreen, type PaceScreenPayload } from "@/lib/cloud/analytics/getPaceScreen";
import { useLiveAnalyticsQuery } from "@/lib/cloud/analytics/useLiveAnalyticsQuery";
import { useAuthSession } from "@/store/useStore";
import { buildHomeRoute } from "@/utils/appRoutes";
import { toNumber } from "@/utils/numbers";
import { formatDuration } from "@/utils/turnPace";

function formatSeconds(seconds: unknown): string {
  return formatDuration(Math.max(0, toNumber(seconds)) * 1000);
}

export default function PaceScreen() {
  const router = useRouter();
  const authSession = useAuthSession();
  const profileId = String(authSession?.user?.id ?? "").trim();

  const paceQuery = useLiveAnalyticsQuery<PaceScreenPayload>({
    enabled: Boolean(profileId),
    queryKey: `pace-screen:${profileId || "anon"}`,
    load: () => getPaceScreen({ profileId }),
  });

  const payload = paceQuery.payload ?? null;
  const league = payload?.league ?? null;
  const players = useMemo(
    () => (Array.isArray(payload?.players) ? payload.players : []),
    [payload?.players],
  );
  const byPlayerCount = useMemo(
    () =>
      Array.isArray(league?.lengthByPlayerCount) ? league.lengthByPlayerCount : [],
    [league?.lengthByPlayerCount],
  );

  const gamesMeasured = toNumber(league?.gamesMeasured);
  const hasData = gamesMeasured > 0;

  return (
    <PageShell preset="analytics" density="compact">
      <AppHeader
        eyebrow="Analytics"
        title="Pace"
        subtitle="How long games and turns actually run"
        size="compact"
      />

      {paceQuery.loading && !payload ? (
        <EmptyStateCard message="Measuring table time from your saved rounds..." />
      ) : paceQuery.error ? (
        <EmptyStateCard
          message="Pace data could not load."
          hint="Check your connection, then pull to refresh from Analytics."
        />
      ) : !hasData ? (
        <EmptyStateCard
          message="No measurable games yet."
          hint="Pace uses the clock between saved turns, so imported history without real timing is skipped. Play a tracked game and this fills in."
        />
      ) : (
        <>
          <SectionCard
            title="League"
            subtitle={`${gamesMeasured} measured game${gamesMeasured === 1 ? "" : "s"} · time between saved turns`}
          >
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Median game</Text>
                <Text style={styles.statValue}>
                  {formatSeconds(league?.medianGameSeconds)}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Median turn</Text>
                <Text style={styles.statValue}>
                  {formatSeconds(league?.medianTurnSeconds)}
                </Text>
              </View>
            </View>

            {byPlayerCount.length > 0 ? (
              <View style={styles.breakdownList}>
                {byPlayerCount.map((row) => (
                  <View key={String(row.playerCount)} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      {toNumber(row.playerCount)} players
                    </Text>
                    <Text style={styles.breakdownValue}>
                      {formatSeconds(row.medianGameSeconds)} ·{" "}
                      {toNumber(row.games)} game{toNumber(row.games) === 1 ? "" : "s"}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Players"
            subtitle="Slowest median turn first · minimum 5 measured turns"
          >
            {players.length === 0 ? (
              <Text style={styles.emptyPlayers}>
                Nobody has enough measured turns yet.
              </Text>
            ) : (
              <View style={styles.playerList}>
                {players.map((player) => (
                  <View key={String(player.profileId)} style={styles.playerRow}>
                    <Text style={styles.playerName}>{player.name ?? "Unknown"}</Text>
                    <Text style={styles.playerMeta}>
                      {formatSeconds(player.medianTurnSeconds)} median ·{" "}
                      {toNumber(player.turns)} turns ·{" "}
                      {Math.round(toNumber(player.tableShare) * 100)}% of table time ·
                      longest {formatSeconds(player.longestTurnSeconds)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>
        </>
      )}

      <View style={styles.footer}>
        <ActionButton
          title="Back"
          variant="ghost"
          onPress={() => router.replace(buildHomeRoute("hubs"))}
        />
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  statRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(9, 15, 31, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.14)",
    gap: 4,
  },
  statLabel: {
    color: "#8EA3C7",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statValue: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
  },
  breakdownList: {
    marginTop: 12,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabel: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
  },
  breakdownValue: {
    color: "rgba(226,232,240,0.66)",
    fontSize: 12,
    fontWeight: "500",
  },
  playerList: {
    gap: 10,
  },
  playerRow: {
    gap: 2,
  },
  playerName: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "700",
  },
  playerMeta: {
    color: "rgba(226,232,240,0.62)",
    fontSize: 11,
    fontWeight: "500",
  },
  emptyPlayers: {
    color: "rgba(226,232,240,0.62)",
    fontSize: 12,
  },
  footer: {
    marginTop: 8,
  },
});
