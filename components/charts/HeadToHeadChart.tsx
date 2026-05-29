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
const MOMENTUM_CAPSULE_WIDTH = 18;
const MOMENTUM_TRACK_HEIGHT = 96;

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

function runLabel(name: string | null, length: number) {
  if (!name || length <= 0) {
    return "No active streak";
  }

  return `${name} \u00b7 ${length}-game run`;
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
            ? `${summary.currentRunWinnerName} is on a ${summary.currentRunLength}-game run. ${summary.verdict}`
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
      />

      <View style={styles.heroCard}>
        <View style={[styles.headerRow, !showHeader && styles.headerRowCompact]}>
          <View style={styles.headerText}>
            <Text style={styles.matchupEyebrow}>{showHeader ? title : "Matchup"}</Text>
            <Text style={styles.matchupTitle}>
              {summary.playerAName} vs {summary.playerBName}
            </Text>
            <Text style={styles.matchupSummary}>
              {showHeader
                ? subtitle
                : `${summary.games} shared games | ${runLabel(
                    summary.currentRunWinnerName,
                    summary.currentRunLength
                  )}`}
            </Text>
          </View>
          <View
            style={[
              styles.leaderBadge,
              summary.leaderTone === "a"
                ? {
                    backgroundColor: withChartAlpha(summary.playerAColor, 0.12),
                    borderColor: withChartAlpha(summary.playerAColor, 0.34),
                  }
                : summary.leaderTone === "b"
                  ? {
                      backgroundColor: withChartAlpha(summary.playerBColor, 0.12),
                      borderColor: withChartAlpha(summary.playerBColor, 0.34),
                    }
                  : {
                      backgroundColor: COLORS.whiteSoft,
                      borderColor: COLORS.border,
                    },
            ]}
          >
            <Text style={styles.leaderBadgeLabel}>
              {summary.leaderTone === "tie" ? "Even" : "Leader"}
            </Text>
            <Text numberOfLines={2} style={styles.leaderBadgeValue}>
              {summary.leaderName}
            </Text>
          </View>
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
            <View style={styles.scoreLabelRow}>
              <View style={[styles.playerDot, { backgroundColor: summary.playerAColor }]} />
              <Text numberOfLines={2} style={styles.scoreLabel}>
                {summary.playerAName}
              </Text>
            </View>
            <View style={styles.scoreMetaRow}>
              <View style={styles.scoreValueBlock}>
                <Text style={[styles.scoreValue, { color: summary.playerAColor }]}>
                  {summary.aWins}
                </Text>
                <Text style={styles.scoreValueLabel}>wins</Text>
              </View>
              <View
                style={[
                  styles.scorePercentChip,
                  {
                    backgroundColor: withChartAlpha(summary.playerAColor, 0.14),
                    borderColor: withChartAlpha(summary.playerAColor, 0.3),
                  },
                ]}
              >
                <Text style={[styles.scorePercentText, { color: summary.playerAColor }]}>
                  {pct(summary.aWins / summary.games)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.centerCard}>
            <Text style={styles.centerLabel}>Shared sample</Text>
            <Text style={styles.centerValue}>{summary.games}</Text>
            <Text style={styles.centerHelper}>games</Text>
            <View style={styles.centerDivider} />
            <Text numberOfLines={2} style={styles.centerRunLabel}>
              {runLabel(summary.currentRunWinnerName, summary.currentRunLength)}
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
            <View style={styles.scoreLabelRow}>
              <View style={[styles.playerDot, { backgroundColor: summary.playerBColor }]} />
              <Text numberOfLines={2} style={styles.scoreLabel}>
                {summary.playerBName}
              </Text>
            </View>
            <View style={styles.scoreMetaRow}>
              <View style={styles.scoreValueBlock}>
                <Text style={[styles.scoreValue, { color: summary.playerBColor }]}>
                  {summary.bWins}
                </Text>
                <Text style={styles.scoreValueLabel}>wins</Text>
              </View>
              <View
                style={[
                  styles.scorePercentChip,
                  {
                    backgroundColor: withChartAlpha(summary.playerBColor, 0.14),
                    borderColor: withChartAlpha(summary.playerBColor, 0.3),
                  },
                ]}
              >
                <Text style={[styles.scorePercentText, { color: summary.playerBColor }]}>
                  {pct(summary.bWins / summary.games)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.summaryChipGrid}>
          <View style={[styles.summaryChip, styles.summaryChipHalf]}>
            <Text style={styles.summaryChipLabel}>Prestige Gap</Text>
            <Text style={styles.summaryChipValue}>{signed(summary.avgPrestigeMargin)}</Text>
            <Text style={styles.summaryChipHelper}>
              {summary.playerAName} minus {summary.playerBName}
            </Text>
          </View>

          <View style={[styles.summaryChip, styles.summaryChipHalf]}>
            <Text style={styles.summaryChipLabel}>Score Gap</Text>
            <Text style={styles.summaryChipValue}>{signed(summary.avgScoreMargin)}</Text>
            <Text style={styles.summaryChipHelper}>Full score comparison</Text>
          </View>

          <View
            style={[
              styles.summaryChip,
              styles.summaryChipFull,
              {
                backgroundColor: withChartAlpha(
                  summary.swingLeaderName === summary.playerAName
                    ? summary.playerAColor
                    : summary.swingLeaderName === summary.playerBName
                      ? summary.playerBColor
                      : COLORS.textStrong,
                  0.12
                ),
                borderColor: withChartAlpha(
                  summary.swingLeaderName === summary.playerAName
                    ? summary.playerAColor
                    : summary.swingLeaderName === summary.playerBName
                      ? summary.playerBColor
                      : COLORS.textStrong,
                  0.26
                ),
              },
            ]}
          >
            <Text style={styles.summaryChipLabel}>Recent Swing</Text>
            <Text style={styles.summaryChipValue}>{summary.swingLeaderName ?? "Even"}</Text>
            <Text style={styles.summaryChipHelper}>
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
            <Text style={styles.verdict}>{summary.verdict}</Text>
          </View>
        }
      >
        <View style={styles.timelineShell}>
          <View style={styles.timelineRow}>
            {summary.timeline.map((point) => {
              const heightPct = Math.max(
                MIN_MOMENTUM_HEIGHT_PCT,
                (Math.abs(point.prestigeMargin) / summary.maxAbsPrestigeMargin) * 100
              );
              const isLatest = point.key === summary.latestResult?.key;
              const winnerColor =
                point.winner === "a"
                  ? summary.playerAColor
                  : point.winner === "b"
                    ? summary.playerBColor
                    : COLORS.sub;

              return (
                <View key={point.key} style={styles.timelineColumn}>
                  <Text style={styles.timelineGameLabel}>{point.label.replace("Game ", "G")}</Text>
                  <View
                    style={[
                      styles.latestResultFrame,
                      isLatest
                        ? {
                            backgroundColor: withChartAlpha(winnerColor, 0.12),
                            borderColor: withChartAlpha(winnerColor, 0.3),
                          }
                        : styles.latestResultFrameIdle,
                    ]}
                  >
                    <View style={styles.momentumTrack}>
                      <View style={styles.trackHalfTop}>
                        {point.winner === "a" ? (
                          <View
                            style={[
                              styles.momentumCapsule,
                              {
                                height: `${heightPct}%`,
                                backgroundColor: withChartAlpha(winnerColor, 0.82),
                                borderColor: withChartAlpha(winnerColor, 0.92),
                              },
                            ]}
                          />
                        ) : null}
                      </View>
                      <View style={styles.trackDivider} />
                      <View style={styles.trackHalfBottom}>
                        {point.winner === "b" ? (
                          <View
                            style={[
                              styles.momentumCapsule,
                              {
                                height: `${heightPct}%`,
                                backgroundColor: withChartAlpha(winnerColor, 0.82),
                                borderColor: withChartAlpha(winnerColor, 0.92),
                              },
                            ]}
                          />
                        ) : null}
                      </View>
                      {point.winner === "tie" ? (
                        <View style={[styles.tieDot, { backgroundColor: winnerColor }]} />
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
    gap: 14,
  },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  headerRowCompact: {
    alignItems: "flex-start",
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  matchupEyebrow: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  matchupTitle: {
    color: COLORS.textStrong,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22,
  },
  matchupSummary: {
    color: COLORS.sub,
    fontSize: 11,
    lineHeight: 16,
  },
  leaderBadge: {
    minWidth: 116,
    maxWidth: "42%",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    justifyContent: "center",
  },
  leaderBadgeLabel: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  leaderBadgeValue: {
    color: COLORS.textStrong,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 20,
  },
  scoreboardRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  scoreCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: COLORS.cardAlt,
    padding: 12,
    gap: 10,
    justifyContent: "space-between",
    minHeight: 108,
  },
  scoreLabelRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  scoreMetaRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  scoreValueBlock: {
    gap: 2,
  },
  centerCard: {
    width: 96,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.whiteSoft,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  playerDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 3,
  },
  scoreLabel: {
    color: COLORS.textStrong,
    fontSize: 13,
    fontWeight: "800",
    flexShrink: 1,
    lineHeight: 16,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: "900",
  },
  scoreValueLabel: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  scorePercentChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  scorePercentText: {
    fontSize: 11,
    fontWeight: "800",
  },
  centerValue: {
    color: COLORS.textStrong,
    fontSize: 24,
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
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
  },
  centerDivider: {
    width: "100%",
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },
  centerRunLabel: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
    textAlign: "center",
  },
  summaryChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.whiteSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  summaryChipHalf: {
    flexGrow: 1,
    flexBasis: "47%",
  },
  summaryChipFull: {
    width: "100%",
  },
  summaryChipLabel: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  summaryChipValue: {
    color: COLORS.textStrong,
    fontSize: 17,
    fontWeight: "900",
  },
  summaryChipHelper: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
  },
  timelineStage: {
    marginBottom: 6,
  },
  timelineStagePlot: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: "rgba(15, 27, 54, 0.98)",
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
    fontSize: 16,
    fontWeight: "900",
  },
  timelineSub: {
    color: withChartAlpha(COLORS.textStrong, 0.72),
    fontSize: 11,
    textAlign: "right",
    flexShrink: 1,
  },
  timelineShell: {
    paddingTop: 4,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  timelineColumn: {
    flex: 1,
    minWidth: 40,
    alignItems: "center",
    gap: 8,
  },
  timelineGameLabel: {
    color: withChartAlpha(COLORS.textStrong, 0.74),
    fontSize: 10,
    fontWeight: "800",
  },
  latestResultFrame: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  latestResultFrameIdle: {
    backgroundColor: withChartAlpha(COLORS.textStrong, 0.02),
    borderColor: COLORS.border,
  },
  momentumTrack: {
    position: "relative",
    width: 34,
    height: MOMENTUM_TRACK_HEIGHT,
    borderRadius: 18,
    backgroundColor: withChartAlpha(COLORS.textStrong, 0.04),
    overflow: "hidden",
  },
  trackHalfTop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 6,
  },
  trackDivider: {
    height: 1,
    marginHorizontal: 5,
    backgroundColor: withChartAlpha(COLORS.textStrong, 0.22),
  },
  trackHalfBottom: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 6,
  },
  momentumCapsule: {
    width: MOMENTUM_CAPSULE_WIDTH,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 10,
  },
  tieDot: {
    position: "absolute",
    top: MOMENTUM_TRACK_HEIGHT / 2 - 6,
    left: 11,
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withChartAlpha(COLORS.textStrong, 0.38),
  },
  timelineMarginChip: {
    minWidth: 50,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineMargin: {
    fontSize: 10,
    fontWeight: "800",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
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
    gap: 10,
    paddingHorizontal: 4,
  },
  verdict: {
    color: withChartAlpha(COLORS.textStrong, 0.9),
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
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
