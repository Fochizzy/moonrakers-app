import React, { useMemo, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import ActionButton from "@/components/ui/ActionButton";
import HeroCard from "@/components/ui/HeroCard";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import { useStore } from "@/store/useStore";
import {
  APP_ROUTES,
  buildHistoryRoute,
  buildPlayerProfileRoute,
} from "@/utils/appRoutes";
import { formatDate } from "@/utils/formatters";
import { toNumber } from "@/utils/numbers";
import { getPlayerAccentColor } from "@/utils/turnTheme";

type Player = {
  id: string;
  name: string;
  color?: string;
  startOrder?: number;
};

type Round = {
  id?: string;
  playerId: string;
  prestige?: number;
  contracts?: number;
  failures?: number;
  assistRecipients?: Record<string, number>;
  assistPrestigeRecipients?: Record<string, number>;
  createdAt?: number;
};

type Totals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeBySource?: Record<string, number>;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
};

type Game = {
  id: string;
  createdAt?: number;
  players?: Player[];
  rounds?: Round[];
  totals?: Record<string, Totals>;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
};

function getWinnerId(game?: Game): string | undefined {
  if (!game) return undefined;
  return game.winnerId ?? game.selectedWinnerId ?? game.manualWinnerId;
}

function getTotalPrestige(totals?: Totals): number {
  const explicit = totals?.totalPrestige ?? totals?.prestige;
  if (typeof explicit === "number" && Number.isFinite(explicit)) {
    return explicit;
  }

  return toNumber(totals?.directPrestige) + toNumber(totals?.assistPrestigeReceived);
}

function safeDivide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillLabel}>{label}</Text>
      <Text style={styles.statPillValue}>{value}</Text>
    </View>
  );
}

function NavButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.navButton}>
      <Text style={styles.navButtonText}>{label}</Text>
    </Pressable>
  );
}

function MiniTag({ label }: { label: string }) {
  return (
    <View style={styles.miniTag}>
      <Text style={styles.miniTagText}>{label}</Text>
    </View>
  );
}

export default function GameTrendsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gameId?: string | string[] }>();
  const gameId = Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;

  const games = useStore((state: any) =>
    Array.isArray(state?.games) ? state.games : [],
  ) as Game[];

  const game = useMemo(() => {
    if (!gameId) return undefined;
    return games.find((entry) => entry.id === gameId);
  }, [gameId, games]);

  const scrollRef = useRef<ScrollView | null>(null);
  const sectionOffsets = useRef<Record<string, number>>({});

  const players = game?.players ?? [];
  const rounds = game?.rounds ?? [];
  const totals = game?.totals ?? {};
  const winnerId = getWinnerId(game);
  const winner = players.find((player) => player.id === winnerId);

  const orderedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const seatA =
        typeof a.startOrder === "number" && Number.isFinite(a.startOrder)
          ? a.startOrder
          : 999;
      const seatB =
        typeof b.startOrder === "number" && Number.isFinite(b.startOrder)
          ? b.startOrder
          : 999;
      return seatA - seatB;
    });
  }, [players]);

  const prestigeTrendRows = useMemo(() => {
    const running: Record<string, number> = {};
    players.forEach((player) => {
      running[player.id] = 0;
    });

    return rounds.map((round, index) => {
      running[round.playerId] = (running[round.playerId] ?? 0) + toNumber(round.prestige);

      return {
        round: index + 1,
        leaderId: [...players].sort((a, b) => (running[b.id] ?? 0) - (running[a.id] ?? 0))[0]
          ?.id,
        values: { ...running },
      };
    });
  }, [players, rounds]);

  const turnOrderEffectRows = useMemo(() => {
    return orderedPlayers.map((player, index) => {
      const stat = totals[player.id];
      return {
        id: player.id,
        name: player.name,
        color: player.color,
        seat:
          typeof player.startOrder === "number" && Number.isFinite(player.startOrder)
            ? player.startOrder + 1
            : index + 1,
        totalPrestige: getTotalPrestige(stat),
        directPrestige: toNumber(stat?.directPrestige),
        assistPrestige: toNumber(stat?.assistPrestigeReceived),
        score: toNumber(stat?.score),
        winner: winnerId === player.id,
      };
    });
  }, [orderedPlayers, totals, winnerId]);

  const contractFailureRows = useMemo(() => {
    return orderedPlayers.map((player) => {
      const stat = totals[player.id];
      const contracts = toNumber(stat?.contracts);
      const failures = toNumber(stat?.failures);
      const attempts = contracts + failures;

      return {
        id: player.id,
        name: player.name,
        color: player.color,
        contracts,
        failures,
        attempts,
        successRate: safeDivide(contracts, attempts),
      };
    });
  }, [orderedPlayers, totals]);

  const winnerPredictionRows = useMemo(() => {
    if (!players.length) return [];

    const running: Record<string, number> = {};
    players.forEach((player) => {
      running[player.id] = 0;
    });

    return rounds.map((round, index) => {
      running[round.playerId] = (running[round.playerId] ?? 0) + toNumber(round.prestige);

      const ranked = [...players]
        .map((player) => ({
          id: player.id,
          name: player.name,
          total: running[player.id] ?? 0,
        }))
        .sort((a, b) => b.total - a.total);

      const leader = ranked[0];
      const second = ranked[1];
      const margin = leader && second ? leader.total - second.total : leader?.total ?? 0;

      return {
        round: index + 1,
        projectedWinnerId: leader?.id,
        projectedWinnerName: leader?.name ?? "-",
        projectedTotal: leader?.total ?? 0,
        margin,
        correct: leader?.id === winnerId,
      };
    });
  }, [players, rounds, winnerId]);

  const playerCardRows = useMemo(() => {
    return orderedPlayers.map((player) => {
      const stat = totals[player.id];
      return {
        id: player.id,
        name: player.name,
        color: player.color,
        totalPrestige: getTotalPrestige(stat),
        directPrestige: toNumber(stat?.directPrestige),
        assistPrestige: toNumber(stat?.assistPrestigeReceived),
        score: toNumber(stat?.score),
        assists: toNumber(stat?.assists),
        contracts: toNumber(stat?.contracts),
        failures: toNumber(stat?.failures),
      };
    });
  }, [orderedPlayers, totals]);

  function scrollToSection(key: string) {
    const y = sectionOffsets.current[key];
    if (typeof y === "number" && scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(0, y - 84), animated: true });
    }
  }

  if (!game) {
    return (
      <PageShell preset="analytics" density="compact">
        <HeroCard
          eyebrow="Postgame"
          title="Game not found"
          subtitle="The saved game for this trends page could not be found."
          size="compact"
          variant="stat"
          actions={
            <View style={styles.heroActions}>
              <ActionButton
                title="Back to History"
                variant="secondary"
                onPress={() => router.push(buildHistoryRoute())}
                style={styles.heroAction}
              />
              <ActionButton
                title="Home"
                variant="ghost"
                onPress={() => router.push(APP_ROUTES.home)}
                style={styles.heroAction}
              />
            </View>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell preset="analytics" density="compact" scroll={false}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HeroCard
          eyebrow="Postgame"
          title="Game Trends & Breakdown"
          subtitle={`${formatDate(game.createdAt)} | ${rounds.length} rounds | Winner ${winner?.name ?? "Unknown"}`}
          size="compact"
          variant="stat"
          actions={
            <View style={styles.heroActions}>
              <ActionButton
                title="Back"
                variant="secondary"
                onPress={() => router.back()}
                style={styles.heroAction}
              />
              <ActionButton
                title="Home"
                variant="ghost"
                onPress={() => router.push(APP_ROUTES.home)}
                style={styles.heroAction}
              />
            </View>
          }
        >
          <View style={styles.summaryGrid}>
            <StatPill label="Players" value={players.length} />
            <StatPill label="Rounds" value={rounds.length} />
            <StatPill label="Winner" value={winner?.name ?? "-"} />
            <StatPill
              label="Top Prestige"
              value={Math.max(0, ...playerCardRows.map((row) => row.totalPrestige))}
            />
          </View>
          <Text style={styles.heroNote}>
            Follow one saved game through pace, seat order, contract pressure, and winner projection.
          </Text>
        </HeroCard>

        <SectionCard
          eyebrow="Navigate"
          title="Open Trends"
          subtitle="Jump to a section without losing your place."
        >
          <View style={styles.navGrid}>
            <NavButton label="Prestige Trends" onPress={() => scrollToSection("prestige")} />
            <NavButton label="Turn Order Effect" onPress={() => scrollToSection("turnOrder")} />
            <NavButton
              label="Contracts & Failures"
              onPress={() => scrollToSection("contracts")}
            />
            <NavButton
              label="Winner Prediction"
              onPress={() => scrollToSection("prediction")}
            />
            <NavButton label="Player Cards" onPress={() => scrollToSection("playerCards")} />
          </View>
        </SectionCard>

        <View
          onLayout={(event) => {
            sectionOffsets.current.prestige = event.nativeEvent.layout.y;
          }}
        >
          <SectionCard
            eyebrow="Timeline"
            title="Prestige Trends"
            subtitle="Running prestige after each recorded round."
          >
            {prestigeTrendRows.length === 0 ? (
              <Text style={styles.emptyText}>No rounds recorded for this game.</Text>
            ) : (
              prestigeTrendRows.map((row) => (
                <View key={`prestige-${row.round}`} style={styles.rowCard}>
                  <Text style={styles.rowTitle}>Round {row.round}</Text>
                  {orderedPlayers.map((player) => (
                    <View key={`${row.round}-${player.id}`} style={styles.metricRow}>
                      <View style={styles.metricLeft}>
                        <View
                          style={[
                            styles.dot,
                            { backgroundColor: getPlayerAccentColor(player.color) },
                          ]}
                        />
                        <Text style={styles.metricLabel} numberOfLines={1}>
                          {player.name}
                        </Text>
                      </View>
                      <Text style={styles.metricValue}>{row.values[player.id] ?? 0}</Text>
                    </View>
                  ))}
                  <Text style={styles.noteText}>
                    Leader after round {row.round}:{" "}
                    {players.find((player) => player.id === row.leaderId)?.name ?? "-"}
                  </Text>
                </View>
              ))
            )}
          </SectionCard>
        </View>

        <View
          onLayout={(event) => {
            sectionOffsets.current.turnOrder = event.nativeEvent.layout.y;
          }}
        >
          <SectionCard
            eyebrow="Seats"
            title="Turn Order Effect"
            subtitle="Compare seat position against total output."
          >
            {turnOrderEffectRows.map((row) => (
              <View key={row.id} style={styles.rowCard}>
                <View style={styles.metricRow}>
                  <View style={styles.metricLeft}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: getPlayerAccentColor(row.color) },
                      ]}
                    />
                    <Text style={styles.rowTitle}>
                      Seat {row.seat} | {row.name}
                      {row.winner ? " | Winner" : ""}
                    </Text>
                  </View>
                  <Text style={styles.metricValue}>{row.totalPrestige}</Text>
                </View>

                <View style={styles.inlineStats}>
                  <MiniTag label={`Direct ${row.directPrestige}`} />
                  <MiniTag label={`Assist ${row.assistPrestige}`} />
                  <MiniTag label={`Score ${row.score}`} />
                </View>
              </View>
            ))}
          </SectionCard>
        </View>

        <View
          onLayout={(event) => {
            sectionOffsets.current.contracts = event.nativeEvent.layout.y;
          }}
        >
          <SectionCard
            eyebrow="Pressure"
            title="Contracts & Failures"
            subtitle="Track conversion rate across scored contract attempts."
          >
            {contractFailureRows.map((row) => (
              <View key={row.id} style={styles.rowCard}>
                <View style={styles.metricRow}>
                  <View style={styles.metricLeft}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: getPlayerAccentColor(row.color) },
                      ]}
                    />
                    <Text style={styles.rowTitle}>{row.name}</Text>
                  </View>
                  <Text style={styles.metricValue}>{(row.successRate * 100).toFixed(0)}%</Text>
                </View>

                <View style={styles.inlineStats}>
                  <MiniTag label={`Contracts ${row.contracts}`} />
                  <MiniTag label={`Failures ${row.failures}`} />
                  <MiniTag label={`Attempts ${row.attempts}`} />
                </View>
              </View>
            ))}
          </SectionCard>
        </View>

        <View
          onLayout={(event) => {
            sectionOffsets.current.prediction = event.nativeEvent.layout.y;
          }}
        >
          <SectionCard
            eyebrow="Projection"
            title="Winner Prediction"
            subtitle="How early the pace of play pointed at the final winner."
          >
            {winnerPredictionRows.length === 0 ? (
              <Text style={styles.emptyText}>No rounds recorded for this game.</Text>
            ) : (
              winnerPredictionRows.map((row) => (
                <View key={`prediction-${row.round}`} style={styles.rowCard}>
                  <View style={styles.metricRow}>
                    <Text style={styles.rowTitle}>Round {row.round}</Text>
                    <Text
                      style={[
                        styles.predictionBadge,
                        row.correct ? styles.predictionBadgeCorrect : styles.predictionBadgeMiss,
                      ]}
                    >
                      {row.correct ? "Matched final winner" : "Projection changed"}
                    </Text>
                  </View>

                  <Text style={styles.noteText}>
                    Projected winner: {row.projectedWinnerName}
                  </Text>
                  <View style={styles.inlineStats}>
                    <MiniTag label={`Projected prestige ${row.projectedTotal}`} />
                    <MiniTag label={`Lead margin ${row.margin}`} />
                  </View>
                </View>
              ))
            )}
          </SectionCard>
        </View>

        <View
          onLayout={(event) => {
            sectionOffsets.current.playerCards = event.nativeEvent.layout.y;
          }}
        >
          <SectionCard
            eyebrow="Profiles"
            title="Player Cards"
            subtitle="Jump from this match into each player's full profile."
          >
            {playerCardRows.map((row) => (
              <Pressable
                key={row.id}
                style={styles.playerCard}
                onPress={() => router.push(buildPlayerProfileRoute(row.id))}
              >
                <View style={styles.metricRow}>
                  <View style={styles.metricLeft}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: getPlayerAccentColor(row.color) },
                      ]}
                    />
                    <Text style={styles.rowTitle}>{row.name}</Text>
                  </View>
                  <Text style={styles.openText}>Open profile</Text>
                </View>

                <View style={styles.inlineStats}>
                  <MiniTag label={`Prestige ${row.totalPrestige}`} />
                  <MiniTag label={`Direct ${row.directPrestige}`} />
                  <MiniTag label={`Assist ${row.assistPrestige}`} />
                  <MiniTag label={`Score ${row.score}`} />
                  <MiniTag label={`Contracts ${row.contracts}`} />
                  <MiniTag label={`Failures ${row.failures}`} />
                </View>
              </Pressable>
            ))}
          </SectionCard>
        </View>
      </ScrollView>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 12,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroAction: {
    flexGrow: 1,
    minWidth: 132,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroNote: {
    color: "#BBD2F6",
    fontSize: 11,
    lineHeight: 17,
  },
  navGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  navButton: {
    minWidth: "48%",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(18,31,52,0.92)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.20)",
  },
  navButtonText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "800",
  },
  rowCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(18,31,52,0.92)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.18)",
    marginBottom: 8,
    gap: 8,
  },
  rowTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  metricLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  metricLabel: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "700",
  },
  metricValue: {
    color: "#93C5FD",
    fontSize: 16,
    fontWeight: "900",
  },
  inlineStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  miniTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.14)",
  },
  miniTagText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "700",
  },
  statPill: {
    minWidth: 92,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  statPillLabel: {
    fontSize: 10,
    color: "#8EA6C8",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  statPillValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  noteText: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 18,
  },
  predictionBadge: {
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  predictionBadgeCorrect: {
    color: "#DCFCE7",
    backgroundColor: "rgba(34,197,94,0.18)",
  },
  predictionBadgeMiss: {
    color: "#FDE68A",
    backgroundColor: "rgba(59,130,246,0.18)",
  },
  playerCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(18,31,52,0.92)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.18)",
    marginBottom: 8,
    gap: 8,
  },
  openText: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "800",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
  },
});
