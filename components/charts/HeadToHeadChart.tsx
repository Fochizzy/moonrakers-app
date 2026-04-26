import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import ChartFocusCard from "@/components/charts/ChartFocusCard";
import ChartStage from "@/components/charts/ChartStage";
import Text from "@/components/ui/Text";
import { CHART_COLORS, withChartAlpha } from "./chartVisualSystem";
import { buildHeadToHeadVisualModel } from "./headToHeadModel";

type Player = { id: string; name?: string; color?: string };

type SnapshotPoint = {
  round?: number;
  gameIndex?: number;
  label?: string;
  snapshot?: Record<string, Record<string, number>>;
};

type GameLike = {
  id?: string;
  players?: Player[];
  totals?: Record<string, Record<string, number>>;
};

type Props = {
  data?: SnapshotPoint[];
  games?: GameLike[];
  players?: Player[];
  scopedPlayerIds?: string[];
  playerId?: string | null;
  compareId?: string | null;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
};

const COLORS = CHART_COLORS;
const MIN_MOMENTUM_HEIGHT_PCT = 22;
const MOMENTUM_BAR_WIDTH = 18;

function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function totalPrestige(row?: Record<string, number>) {
  return (
    n(row?.totalPrestige) ||
    n(row?.prestige) ||
    n(row?.directPrestige) +
      n(row?.assistPrestigeReceived) +
      n(row?.objectivePrestige)
  );
}

function totalScore(row?: Record<string, number>) {
  return n(row?.score) || totalPrestige(row);
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function pct(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}

function gamesToSnapshots(games: GameLike[] = []): SnapshotPoint[] {
  return games.map((game, index) => {
    const snapshot: Record<string, Record<string, number>> = {};
    Object.entries(game?.totals ?? {}).forEach(([playerId, totals]) => {
      snapshot[String(playerId)] = {
        score: n(totals?.score),
        totalPrestige: totalPrestige(totals),
        prestige: n(totals?.prestige) || totalPrestige(totals),
        directPrestige: n(totals?.directPrestige),
        assistPrestigeReceived: n(totals?.assistPrestigeReceived),
        objectivePrestige: n(totals?.objectivePrestige),
      };
    });

    return {
      round: index + 1,
      gameIndex: index + 1,
      label: `Game ${index + 1}`,
      snapshot,
    };
  });
}

export default function HeadToHeadChart({
  data = [],
  games = [],
  players = [],
  scopedPlayerIds,
  playerId = null,
  compareId = null,
  title = "Head-to-Head",
  subtitle = "Direct two-player matchup across unified snapshots.",
  showHeader = true,
}: Props) {
  const visiblePlayers = useMemo(() => {
    if (!scopedPlayerIds?.length) return players;
    const allowed = new Set(scopedPlayerIds.map(String));
    return players.filter((player) => allowed.has(String(player.id)));
  }, [players, scopedPlayerIds]);

  const effectiveData = useMemo(
    () => (data?.length ? data : gamesToSnapshots(games)),
    [data, games]
  );

  const summary = useMemo(
    () =>
      buildHeadToHeadVisualModel({
        players: visiblePlayers,
        data: effectiveData,
        playerId,
        compareId,
      }),
    [compareId, effectiveData, playerId, visiblePlayers]
  );

  if (!summary) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No head-to-head data yet</Text>
        <Text style={styles.emptyText}>
          Pick two players with shared saved or imported game history to render this matchup.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ChartFocusCard
        title={summary.leaderTone === "tie" ? "Even Matchup" : summary.leaderName}
        value={signed(summary.avgPrestigeMargin)}
        helper={`Prestige gap | ${summary.games} shared games`}
        story={
          summary.currentRunWinnerName
            ? `${summary.currentRunWinnerName} on a ${summary.currentRunLength}-game run`
            : summary.verdict
        }
        tone="comparison"
        accentColor={
          summary.leaderTone === "a"
            ? summary.playerAColor
            : summary.leaderTone === "b"
              ? summary.playerBColor
              : COLORS.accent
        }
        compact
      />

      <View style={styles.heroCard}>
        <View style={styles.headerRow}>
          {showHeader ? (
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          ) : (
            <View />
          )}
        </View>

        <View style={styles.scoreboardRow}>
          <View
            style={[
              styles.scoreCard,
              {
                borderColor: withChartAlpha(summary.playerAColor, 0.28),
              },
            ]}
          >
            <View style={[styles.playerDot, { backgroundColor: summary.playerAColor }]} />
            <Text style={styles.scoreLabel}>{summary.playerAName}</Text>
            <Text style={[styles.scoreValue, { color: summary.playerAColor }]}>
              {summary.aWins}
            </Text>
            <Text style={styles.scoreHelper}>{pct(summary.aWins / summary.games)} wins</Text>
          </View>

          <View style={styles.centerCard}>
            <Text style={styles.centerValue}>{summary.games}</Text>
            <Text style={styles.centerLabel}>Games</Text>
            <Text style={styles.centerHelper}>
              {summary.leaderTone === "tie" ? "Even so far" : `Leader ${summary.leaderName}`}
            </Text>
          </View>

          <View
            style={[
              styles.scoreCard,
              {
                borderColor: withChartAlpha(summary.playerBColor, 0.28),
              },
            ]}
          >
            <View style={[styles.playerDot, { backgroundColor: summary.playerBColor }]} />
            <Text style={styles.scoreLabel}>{summary.playerBName}</Text>
            <Text style={[styles.scoreValue, { color: summary.playerBColor }]}>
              {summary.bWins}
            </Text>
            <Text style={styles.scoreHelper}>{pct(summary.bWins / summary.games)} wins</Text>
          </View>
        </View>

        <View style={styles.proofRow}>
          <View style={styles.proofCard}>
            <Text style={styles.proofLabel}>Prestige Gap</Text>
            <Text style={styles.proofValue}>{signed(summary.avgPrestigeMargin)}</Text>
            <Text style={styles.proofHelper}>
              {summary.playerAName} minus {summary.playerBName}
            </Text>
          </View>

          <View style={styles.proofCard}>
            <Text style={styles.proofLabel}>Score Gap</Text>
            <Text style={styles.proofValue}>{signed(summary.avgScoreMargin)}</Text>
            <Text style={styles.proofHelper}>Full score comparison</Text>
          </View>

          <View style={styles.proofCard}>
            <Text style={styles.proofLabel}>Recent Swing</Text>
            <Text style={styles.proofValue}>{summary.swingLeaderName ?? "Even"}</Text>
            <Text style={styles.proofHelper}>
              Latest {Math.min(3, summary.games)}-game window
            </Text>
          </View>
        </View>
      </View>

      <ChartStage
        tone="comparison"
        style={styles.timelineStage}
        plotStyle={styles.timelineStagePlot}
        header={
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineTitle}>Momentum Strip</Text>
            <Text style={styles.timelineSub}>
              {summary.latestResult
                ? `${summary.latestResult.winnerName ?? "Tie"} latest by ${signed(
                    summary.latestResult.prestigeMargin
                  )}`
                : "No latest result"}
            </Text>
          </View>
        }
        footer={
          <View style={styles.timelineFooter}>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: summary.playerAColor }]} />
                <Text style={styles.legendText}>{summary.playerAName} wins</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: summary.playerBColor }]} />
                <Text style={styles.legendText}>{summary.playerBName} wins</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.sub }]} />
                <Text style={styles.legendText}>Tie</Text>
              </View>
            </View>

          </View>
        }
      >
        <View style={styles.timelineShell}>
          <View style={styles.baseline} />
          <View style={styles.timelineRow}>
            {summary.timeline.map((point) => {
              const heightPct = Math.max(
                MIN_MOMENTUM_HEIGHT_PCT,
                (Math.abs(point.prestigeMargin) / summary.maxAbsPrestigeMargin) * 100
              );
              const winnerColor =
                point.winner === "a"
                  ? summary.playerAColor
                  : point.winner === "b"
                    ? summary.playerBColor
                    : COLORS.sub;

              return (
                <View key={point.key} style={styles.timelineColumn}>
                  <Text style={styles.timelineGameLabel}>{point.label.replace("Game ", "G")}</Text>
                  <View style={styles.barFrame}>
                    {point === summary.latestResult ? (
                      <View
                        style={[
                          styles.latestBeam,
                          {
                            backgroundColor: withChartAlpha(winnerColor, 0.2),
                            borderColor: withChartAlpha(winnerColor, 0.38),
                          },
                        ]}
                      />
                    ) : null}
                    <View
                      style={[
                        styles.upperLane,
                        {
                          backgroundColor: withChartAlpha(summary.playerAColor, 0.16),
                          borderColor: withChartAlpha(summary.playerAColor, 0.32),
                        },
                      ]}
                    >
                      {point.winner === "a" ? (
                        <View
                          style={[
                            styles.momentumBar,
                            {
                              height: `${heightPct}%`,
                              backgroundColor: winnerColor,
                            },
                          ]}
                        />
                      ) : null}
                    </View>
                    <View style={styles.tieLane}>
                      {point.winner === "tie" ? (
                        <View
                          style={[styles.tieDot, { backgroundColor: winnerColor }]}
                        />
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.lowerLane,
                        {
                          backgroundColor: withChartAlpha(summary.playerBColor, 0.16),
                          borderColor: withChartAlpha(summary.playerBColor, 0.32),
                        },
                      ]}
                    >
                      {point.winner === "b" ? (
                        <View
                          style={[
                            styles.momentumBar,
                            {
                              height: `${heightPct}%`,
                              backgroundColor: winnerColor,
                            },
                          ]}
                        />
                      ) : null}
                    </View>
                  </View>
                  <View
                    style={[
                      styles.timelineMarginChip,
                      point.winner === "tie"
                        ? {
                            backgroundColor: withChartAlpha(COLORS.textStrong, 0.12),
                            borderColor: withChartAlpha(COLORS.textStrong, 0.2),
                          }
                        : {
                            backgroundColor: withChartAlpha(winnerColor, 0.2),
                            borderColor: withChartAlpha(winnerColor, 0.38),
                          },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timelineMargin,
                        { color: point.winner === "tie" ? COLORS.text : winnerColor },
                      ]}
                    >
                      {point.winner === "tie" ? "T" : signed(point.prestigeMargin)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ChartStage>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  heroCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.sub,
    fontSize: 11,
    lineHeight: 16,
  },
  scoreboardRow: {
    flexDirection: "row",
    gap: 10,
  },
  scoreCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: COLORS.cardAlt,
    padding: 12,
    gap: 4,
  },
  centerCard: {
    width: 96,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.whiteSoft,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  playerDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  scoreLabel: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: "900",
  },
  scoreHelper: {
    color: COLORS.sub,
    fontSize: 10,
  },
  centerValue: {
    color: COLORS.textStrong,
    fontSize: 22,
    fontWeight: "900",
  },
  centerLabel: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  centerHelper: {
    color: COLORS.sub,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
  },
  proofRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  proofCard: {
    minWidth: "30%",
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.whiteSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  proofLabel: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  proofValue: {
    color: COLORS.textStrong,
    fontSize: 15,
    fontWeight: "900",
  },
  proofHelper: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
  },
  timelineStage: {
    marginBottom: 6,
  },
  timelineStagePlot: {
    paddingVertical: 12,
    backgroundColor: "rgba(17, 29, 62, 0.98)",
    borderColor: withChartAlpha(COLORS.blue, 0.22),
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 4,
  },
  timelineTitle: {
    color: COLORS.textStrong,
    fontSize: 14,
    fontWeight: "900",
  },
  timelineSub: {
    color: withChartAlpha(COLORS.textStrong, 0.72),
    fontSize: 10,
    textAlign: "right",
    flexShrink: 1,
  },
  timelineShell: {
    position: "relative",
    paddingTop: 8,
  },
  baseline: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 74,
    height: 1,
    backgroundColor: withChartAlpha(COLORS.textStrong, 0.18),
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  timelineColumn: {
    flex: 1,
    minWidth: 36,
    alignItems: "center",
    gap: 6,
  },
  timelineGameLabel: {
    color: withChartAlpha(COLORS.textStrong, 0.74),
    fontSize: 10,
    fontWeight: "800",
  },
  barFrame: {
    width: "100%",
    height: 108,
    alignItems: "center",
    justifyContent: "center",
  },
  latestBeam: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 108,
    borderRadius: 16,
    borderWidth: 1,
  },
  upperLane: {
    width: "100%",
    height: 44,
    alignItems: "center",
    justifyContent: "flex-end",
    borderWidth: 1,
    borderRadius: 14,
    paddingBottom: 4,
  },
  tieLane: {
    width: "100%",
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  lowerLane: {
    width: "100%",
    height: 44,
    alignItems: "center",
    justifyContent: "flex-start",
    borderWidth: 1,
    borderRadius: 14,
    paddingTop: 4,
  },
  momentumBar: {
    width: MOMENTUM_BAR_WIDTH,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withChartAlpha(COLORS.textStrong, 0.44),
    minHeight: 10,
  },
  tieDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withChartAlpha(COLORS.textStrong, 0.38),
  },
  timelineMarginChip: {
    minWidth: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineMargin: {
    fontSize: 9,
    fontWeight: "800",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  legendText: {
    color: withChartAlpha(COLORS.textStrong, 0.82),
    fontSize: 11,
    fontWeight: "700",
  },
  timelineFooter: {
    gap: 6,
    paddingHorizontal: 4,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  emptyTitle: {
    color: COLORS.textStrong,
    fontSize: 14,
    fontWeight: "800",
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 11,
    lineHeight: 16,
  },
});
