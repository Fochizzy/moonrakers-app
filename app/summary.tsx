import React, { useMemo } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import ActionButton from "@/components/ui/ActionButton";
import DefinitionsJumpLink from "@/components/ui/DefinitionsJumpLink";
import DefinitionTermText from "@/components/ui/DefinitionTermText";
import EmptyStateCard from "@/components/ui/EmptyStateCard";
import HeroCard from "@/components/ui/HeroCard";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import { usePlayers } from "@/store/useStore";
import { useResolvedGame } from "@/lib/cloud/useResolvedGame";
import { COLORS } from "@/utils/colors";
import { formatDate } from "@/utils/formatters";
import { buildGameTrendsRoute } from "@/utils/appRoutes";
import {
  getResolvedTotalsForPlayer,
  getWinnerIdFromGame,
} from "@/utils/gameTotals";
import { toNumber } from "@/utils/numbers";
import { buildReplayAssistSummary } from "@/utils/replayAssists";
import { buildGameResultShareText } from "@/utils/shareGameResult";
import { buildGamePace, formatDuration } from "@/utils/turnPace";
import { commitFeedback, warningFeedback } from "@/utils/haptics";

type Player = {
  id: string;
  name: string;
  color?: string;
  initials?: string;
  startOrder?: number;
};

type PlayerTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeSent?: number;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
  objectivePrestige?: number;
  efficiency?: number;
  performance?: number;
};

type RoundLike = {
  id?: string;
  playerId?: string;
  prestige?: number;
  score?: number;
  contracts?: number;
  assists?: number;
  failures?: number;
  objectivePrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  turnOrder?: number;
  roundNumber?: number;
  metaType?: string | null;
  assistRecipients?: Record<string, unknown> | null;
  assistPrestigeRecipients?: Record<string, unknown> | null;
  [key: string]: unknown;
};

type StoredGame = {
  id?: string;
  createdAt?: number;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  groupId?: string;
  groupName?: string;
  players?: Array<{
    id: string;
    name?: string;
    color?: string;
    initials?: string;
    startOrder?: number;
  }>;
  rounds?: RoundLike[];
  timeline?: RoundLike[];
  roundCount?: number;
  totals?: Record<string, PlayerTotals>;
};

function getWinnerId(game?: StoredGame): string | undefined {
  return getWinnerIdFromGame(game);
}

function getRoundsCount(game?: StoredGame): number {
  if (!game) return 0;
  if (
    typeof game.roundCount === "number" &&
    Number.isFinite(game.roundCount)
  ) {
    return game.roundCount;
  }
  if (Array.isArray(game.rounds) && game.rounds.length > 0) {
    return game.rounds.length;
  }
  if (Array.isArray(game.timeline) && game.timeline.length > 0) {
    return game.timeline.length;
  }
  return 0;
}

function getPlayerName(
  playerId: string | undefined,
  gamePlayers: Array<{ id: string; name?: string }> | undefined,
  allPlayers: Player[],
): string {
  if (!playerId) return "Unknown";
  const fromGame = gamePlayers?.find((player) => player.id === playerId)?.name;
  if (fromGame) return fromGame;
  const fromStore = allPlayers.find((player) => player.id === playerId)?.name;
  if (fromStore) return fromStore;
  return "Unknown";
}

function getPlayerColor(
  playerId: string | undefined,
  gamePlayers: Array<{ id: string; color?: string }> | undefined,
  allPlayers: Player[],
): string {
  if (!playerId) return COLORS.accent;
  const fromGame = gamePlayers?.find((player) => player.id === playerId)?.color;
  if (fromGame) return fromGame;
  const fromStore = allPlayers.find((player) => player.id === playerId)?.color;
  if (fromStore) return fromStore;
  return COLORS.accent;
}

function getTotalPrestige(totals?: PlayerTotals): number {
  const explicit = totals?.totalPrestige ?? totals?.prestige;
  if (typeof explicit === "number" && Number.isFinite(explicit)) {
    return explicit;
  }

  return (
    toNumber(totals?.directPrestige) +
    toNumber(totals?.assistPrestigeReceived) +
    toNumber(totals?.objectivePrestige)
  );
}

function buildReplayRows(game?: StoredGame) {
  if (!game) return [];

  const source =
    Array.isArray(game.timeline) && game.timeline.length > 0
      ? game.timeline
      : Array.isArray(game.rounds)
        ? game.rounds
        : [];

  return source.map((item, index) => {
    const assistSummary = buildReplayAssistSummary(item);

    return {
      key: item?.id ?? `turn-${index}`,
      step: index + 1,
      playerId: item?.playerId,
      directPrestige: toNumber(item?.directPrestige ?? item?.prestige ?? item?.score),
      assistPrestige: assistSummary.assistPrestige,
      assistShares: assistSummary.shares,
      objectivePrestige: toNumber(item?.objectivePrestige),
      contracts: toNumber(item?.contracts),
      assists: assistSummary.assistCount,
      failures: toNumber(item?.failures),
      turnOrder: toNumber(item?.turnOrder),
      roundNumber: toNumber(item?.roundNumber),
    };
  });
}

function MetricPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.metricPill}>
      <DefinitionTermText label={label} variant="metricLabel" />
      <Text variant="metricValue">{value}</Text>
    </View>
  );
}

function SectionActions({
  badge,
  showDefinition = false,
}: {
  badge?: string | null;
  showDefinition?: boolean;
}) {
  return (
    <View style={styles.sectionActions}>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {showDefinition ? (
        <DefinitionsJumpLink label="Definition" category="scoring" />
      ) : null}
    </View>
  );
}

export default function SummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gameId?: string }>();
  const rawPlayers = usePlayers();

  const players = useMemo<Player[]>(
    () => (Array.isArray(rawPlayers) ? rawPlayers : []),
    [rawPlayers],
  );

  const routeGameId = Array.isArray(params?.gameId)
    ? params.gameId[0]
    : params?.gameId;
  const resolvedGame = useResolvedGame<StoredGame>(routeGameId);
  const game = resolvedGame.game;

  const winnerId = useMemo(() => getWinnerId(game), [game]);
  const winnerName = useMemo(
    () => getPlayerName(winnerId, game?.players, players),
    [game?.players, players, winnerId],
  );
  const roundsCount = useMemo(() => getRoundsCount(game), [game]);

  const gameTitle = game?.groupName
    ? game.groupName
    : game?.createdAt
      ? formatDate(game.createdAt)
      : "Completed Match";

  const rankedPlayers = useMemo(() => {
    if (!game?.players?.length) return [];

    return [...game.players]
      .map((player) => {
        const totals = getResolvedTotalsForPlayer(game, player.id) as PlayerTotals;

        return {
          id: player.id,
          name: getPlayerName(player.id, game.players, players),
          color: getPlayerColor(player.id, game.players, players),
          totalPrestige: getTotalPrestige(totals),
          directPrestige: toNumber(totals?.directPrestige),
          assistPrestigeReceived: toNumber(totals?.assistPrestigeReceived),
          assistPrestigeSent: toNumber(totals?.assistPrestigeSent),
          objectivePrestige: toNumber(totals?.objectivePrestige),
          score: toNumber(totals?.score),
          assists: toNumber(totals?.assists),
          failures: toNumber(totals?.failures),
          contracts: toNumber(totals?.contracts),
          efficiency: toNumber(totals?.efficiency),
          performance: toNumber(totals?.performance),
        };
      })
      .sort((left, right) => {
        if (right.totalPrestige !== left.totalPrestige) {
          return right.totalPrestige - left.totalPrestige;
        }
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        return left.name.localeCompare(right.name);
      });
  }, [game, players]);

  const replayRows = useMemo(() => buildReplayRows(game), [game]);

  const pace = useMemo(() => {
    if (!game) return null;
    const source =
      Array.isArray(game.timeline) && game.timeline.length > 0
        ? game.timeline
        : Array.isArray(game.rounds)
          ? game.rounds
          : [];

    return buildGamePace(source as never, (game.players ?? []) as never);
  }, [game]);

  async function handleShareResult() {
    if (!rankedPlayers.length) {
      warningFeedback();
      return;
    }

    try {
      const message = buildGameResultShareText({
        gameTitle,
        playedAt: game?.createdAt ? formatDate(game.createdAt) : null,
        groupName: game?.groupName ?? null,
        winnerName,
        roundsCount,
        durationLabel: pace ? formatDuration(pace.gameDurationMs) : null,
        standings: rankedPlayers.map((player) => ({
          name: player.name,
          totalPrestige: player.totalPrestige,
          contracts: player.contracts,
          assists: player.assists,
          failures: player.failures,
        })),
      });

      const result = await Share.share({ message });
      if (result.action === Share.sharedAction) {
        commitFeedback();
      }
    } catch (error) {
      console.error("Share result failed:", error);
      warningFeedback();
    }
  }

  const topPerformer = rankedPlayers[0] ?? null;
  const mostContracts =
    [...rankedPlayers].sort((left, right) => right.contracts - left.contracts)[0] ??
    null;
  const mostAssists =
    [...rankedPlayers].sort((left, right) => right.assists - left.assists)[0] ??
    null;

  if (!routeGameId) {
    return (
      <PageShell preset="analytics" density="compact">
        <HeroCard
          eyebrow="Game Summary"
          title="No Game Selected"
          subtitle="Open this screen from History by tapping a saved game."
          size="compact"
          actions={
            <ActionButton
              title="Back to History"
              variant="secondary"
              onPress={() => router.back()}
            />
          }
        />
      </PageShell>
    );
  }

  if (!game) {
    const isLoading = resolvedGame.status === "loading";

    return (
      <PageShell preset="analytics" density="compact">
        <HeroCard
          eyebrow="Game Summary"
          title={isLoading ? "Loading Game" : "Game Not Found"}
          subtitle={
            isLoading
              ? "Fetching this game from your cloud history."
              : "That saved game is not in this device's history or your cloud history."
          }
          size="compact"
          actions={
            <ActionButton
              title="Back to History"
              variant="secondary"
              onPress={() => router.back()}
            />
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell preset="analytics" density="compact">
      <HeroCard
        eyebrow="Game Summary"
        title={gameTitle}
        subtitle="Review the final standings, detailed totals, and replay flow."
        size="compact"
        variant="stat"
        actions={
          <View style={styles.heroActions}>
            <ActionButton
              title="Share Result"
              variant="primary"
              onPress={() => {
                void handleShareResult();
              }}
            />
            <ActionButton
              title="Back to History"
              variant="secondary"
              onPress={() => router.back()}
            />
          </View>
        }
      >
        <View style={styles.heroMetaRow}>
          <MetricPill label="Players" value={game.players?.length ?? 0} />
          <MetricPill label="Rounds" value={roundsCount} />
          <MetricPill label="Winner" value={winnerName} />
        </View>
      </HeroCard>

      <SectionCard
        style={styles.sectionCard}
        title="Overview"
        actions={<SectionActions badge="Saved Game" showDefinition />}
      >
        <View style={styles.overviewHeader}>
          <View style={styles.overviewTextWrap}>
            <Text style={styles.overviewGameName}>{gameTitle}</Text>
            <Text style={styles.overviewDate}>{formatDate(game.createdAt)}</Text>
          </View>

          <View style={styles.winnerChip}>
            <Text style={styles.winnerChipLabel}>Winner</Text>
            <Text style={styles.winnerChipValue}>{winnerName}</Text>
          </View>
        </View>

        <View style={styles.summaryStatRow}>
          <View style={styles.summaryStatCard}>
            <Text style={styles.summaryStatLabel}>Players</Text>
            <Text style={styles.summaryStatValue}>{game.players?.length ?? 0}</Text>
          </View>
          <View style={styles.summaryStatCard}>
            <Text style={styles.summaryStatLabel}>Rounds</Text>
            <Text style={styles.summaryStatValue}>{roundsCount}</Text>
          </View>
        </View>

        {game.groupName ? (
          <View style={styles.groupTag}>
            <Text style={styles.groupTagText}>Group: {game.groupName}</Text>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard
        style={styles.sectionCard}
        title="Highlights"
        actions={<SectionActions badge="Quick View" showDefinition />}
      >
        <View style={styles.highlightsGrid}>
          <HighlightCard
            label="Top Prestige"
            name={topPerformer?.name ?? "-"}
            meta={topPerformer ? `${topPerformer.totalPrestige} prestige` : "No data"}
          />
          <HighlightCard
            label="Most Contracts"
            name={mostContracts?.name ?? "-"}
            meta={mostContracts ? `${mostContracts.contracts} contracts` : "No data"}
          />
          <HighlightCard
            label="Most Assists"
            name={mostAssists?.name ?? "-"}
            meta={mostAssists ? `${mostAssists.assists} assists` : "No data"}
          />
        </View>
      </SectionCard>

      {pace ? (
        <SectionCard
          style={styles.sectionCard}
          title="Pace"
          subtitle="Time between saved turns"
          actions={<SectionActions badge={formatDuration(pace.gameDurationMs)} />}
        >
          <View style={styles.paceStatRow}>
            <View style={styles.paceStatCard}>
              <Text style={styles.paceStatLabel}>Game length</Text>
              <Text style={styles.paceStatValue}>
                {formatDuration(pace.gameDurationMs)}
              </Text>
            </View>
            <View style={styles.paceStatCard}>
              <Text style={styles.paceStatLabel}>Median turn</Text>
              <Text style={styles.paceStatValue}>
                {formatDuration(pace.medianTurnMs)}
              </Text>
            </View>
            <View style={styles.paceStatCard}>
              <Text style={styles.paceStatLabel}>Longest turn</Text>
              <Text style={styles.paceStatValue}>
                {formatDuration(pace.longestTurnMs)}
              </Text>
            </View>
          </View>

          <View style={styles.paceList}>
            {pace.players.map((player) => (
              <View key={player.playerId} style={styles.paceRow}>
                <Text style={styles.paceName}>{player.name}</Text>
                <Text style={styles.paceMeta}>
                  {formatDuration(player.medianTurnMs)} median · {player.turns} turns ·{" "}
                  {Math.round(player.tableShare * 100)}% of table time
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>
      ) : null}

      <SectionCard
        style={styles.sectionCard}
        title="Final Standings"
        actions={
          <SectionActions
            badge={String(rankedPlayers.length)}
            showDefinition
          />
        }
      >
        <View style={styles.rankList}>
          {rankedPlayers.map((player, index) => (
            <View key={player.id} style={styles.rankCard}>
              <View
                style={[
                  styles.rankAccent,
                  { backgroundColor: player.color || COLORS.accent },
                ]}
              />

              <View style={styles.rankTopRow}>
                <View style={styles.rankIdentity}>
                  <View style={styles.rankBubble}>
                    <Text style={styles.rankBubbleText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.rankTextWrap}>
                    <Text style={styles.rankName}>{player.name}</Text>
                    <Text style={styles.rankMeta}>
                      {player.totalPrestige} Prestige
                    </Text>
                  </View>
                </View>

                {winnerId === player.id ? (
                  <View style={styles.smallWinnerPill}>
                    <Text style={styles.smallWinnerPillText}>Winner</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.metricsGrid}>
                <ScoreMetric label="Direct" value={player.directPrestige} />
                <ScoreMetric
                  label="Assist In"
                  value={player.assistPrestigeReceived}
                />
                <ScoreMetric
                  label="Objectives"
                  value={player.objectivePrestige}
                />
                <ScoreMetric label="Contracts" value={player.contracts} />
                <ScoreMetric label="Assists" value={player.assists} />
                <ScoreMetric label="Failures" value={player.failures} />
              </View>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        style={styles.sectionCard}
        title="Replay Flow"
        actions={
          <SectionActions
            badge={`${replayRows.length} Turns`}
            showDefinition
          />
        }
      >
        {replayRows.length === 0 ? (
          <EmptyStateCard
            message="No timeline data available."
            hint="Timeline entries are recorded during play. Imported games may not include round-level detail."
          />
        ) : (
          <View style={styles.replayList}>
            {replayRows.map((row) => {
              const playerName = getPlayerName(row.playerId, game.players, players);
              const playerColor = getPlayerColor(row.playerId, game.players, players);

              return (
                <View key={row.key} style={styles.replayCard}>
                  <View
                    style={[
                      styles.replayAccent,
                      { backgroundColor: playerColor || COLORS.accent },
                    ]}
                  />

                  <View style={styles.replayHeader}>
                    <View>
                      <Text style={styles.replayTitle}>
                        Turn {row.step} | {playerName}
                      </Text>
                      <Text style={styles.replaySubtitle}>
                        {row.roundNumber > 0
                          ? `Round ${row.roundNumber}`
                          : "Timeline entry"}
                      </Text>
                    </View>

                    <View style={styles.turnChip}>
                      <Text style={styles.turnChipText}>+{row.directPrestige}</Text>
                    </View>
                  </View>

                  <View style={styles.replayMetrics}>
                    <ReplayMetric label="Direct" value={row.directPrestige} />
                    <ReplayMetric
                      label="Assist Prestige Out"
                      value={row.assistPrestige}
                    />
                    <ReplayMetric label="Objective" value={row.objectivePrestige} />
                    <ReplayMetric label="Contracts" value={row.contracts} />
                    <ReplayMetric label="Assists" value={row.assists} />
                    <ReplayMetric label="Failures" value={row.failures} />
                  </View>

                  {row.assistShares.length > 0 ? (
                    <View style={styles.assistBlock}>
                      <Text style={styles.assistBlockLabel}>
                        Assisted By ({row.assistShares.length})
                      </Text>

                      <View style={styles.assistChipRow}>
                        {row.assistShares.map((share) => {
                          const assistName = getPlayerName(
                            share.playerId,
                            game.players,
                            players,
                          );
                          const assistColor = getPlayerColor(
                            share.playerId,
                            game.players,
                            players,
                          );

                          return (
                            <View key={share.playerId} style={styles.assistChip}>
                              <View
                                style={[
                                  styles.assistChipDot,
                                  {
                                    backgroundColor: assistColor || COLORS.accent,
                                  },
                                ]}
                              />
                              <Text
                                style={styles.assistChipName}
                                numberOfLines={1}
                              >
                                {assistName}
                              </Text>
                              <Text style={styles.assistChipValue}>
                                +{share.prestige}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Actions">
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={() => router.back()}
          >
            <Text style={styles.actionButtonText}>Back to History</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() => router.push(buildGameTrendsRoute(routeGameId))}
          >
            <Text style={styles.actionButtonText}>Game Trends</Text>
          </Pressable>
        </View>
      </SectionCard>
    </PageShell>
  );
}

function HighlightCard({
  label,
  name,
  meta,
}: {
  label: string;
  name: string;
  meta: string;
}) {
  return (
    <View style={styles.highlightCard}>
      <Text style={styles.highlightLabel}>{label}</Text>
      <Text style={styles.highlightValue}>{name}</Text>
      <Text style={styles.highlightMeta}>{meta}</Text>
    </View>
  );
}

function ScoreMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.scoreMetricPill}>
      <DefinitionTermText
        label={label}
        numberOfLines={1}
        style={styles.scoreMetricLabel}
      />
      <Text style={styles.scoreMetricValue}>{value}</Text>
    </View>
  );
}

function ReplayMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.replayMetricPill}>
      <DefinitionTermText label={label} style={styles.replayMetricLabel} />
      <Text style={styles.replayMetricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  heroActions: {
    gap: 8,
  },
  metricPill: {
    minWidth: 92,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 4,
  },
  sectionCard: {
    gap: 12,
  },
  sectionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    minWidth: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(168, 85, 247, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(196, 181, 253, 0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#D8B4FE",
    fontSize: 12,
    fontWeight: "900",
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  overviewTextWrap: {
    flex: 1,
    gap: 4,
  },
  overviewGameName: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
  },
  overviewDate: {
    color: "#A5B4FC",
    fontSize: 12,
    fontWeight: "700",
  },
  winnerChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(124, 58, 237, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(196, 181, 253, 0.30)",
    alignSelf: "flex-start",
    minWidth: 92,
  },
  winnerChipLabel: {
    color: "#C4B5FD",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  winnerChipValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  summaryStatRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryStatCard: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(9, 15, 31, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.14)",
    gap: 4,
  },
  summaryStatLabel: {
    color: "#8EA3C7",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryStatValue: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
  },
  paceStatRow: {
    flexDirection: "row",
    gap: 10,
  },
  paceStatCard: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(9, 15, 31, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.14)",
    gap: 4,
  },
  paceStatLabel: {
    color: "#8EA3C7",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  paceStatValue: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "900",
  },
  paceList: {
    marginTop: 12,
    gap: 8,
  },
  paceRow: {
    gap: 2,
  },
  paceName: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "700",
  },
  paceMeta: {
    color: "rgba(226,232,240,0.62)",
    fontSize: 11,
    fontWeight: "500",
  },
  groupTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(147, 197, 253, 0.22)",
  },
  groupTagText: {
    color: "#BFDBFE",
    fontSize: 12,
    fontWeight: "800",
  },
  highlightsGrid: {
    gap: 10,
  },
  highlightCard: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    gap: 4,
  },
  highlightLabel: {
    color: "#A5B4FC",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  highlightValue: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "900",
  },
  highlightMeta: {
    color: "#B8C2D9",
    fontSize: 12,
    fontWeight: "700",
  },
  rankList: {
    gap: 12,
  },
  rankCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 22,
    padding: 14,
    backgroundColor: "rgba(17, 24, 39, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.18)",
    gap: 12,
  },
  rankAccent: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    opacity: 0.95,
  },
  rankTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rankIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rankBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(124, 58, 237, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(196, 181, 253, 0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  rankBubbleText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  rankTextWrap: {
    flex: 1,
    gap: 2,
  },
  rankName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  rankMeta: {
    color: "#B8C2D9",
    fontSize: 12,
    fontWeight: "700",
  },
  smallWinnerPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(45,212,191,0.18)",
    borderWidth: 1,
    borderColor: "rgba(94,234,212,0.35)",
  },
  smallWinnerPillText: {
    color: "#CCFBF1",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scoreMetricPill: {
    minWidth: "30%",
    flexGrow: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: "rgba(9, 15, 31, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    gap: 3,
  },
  scoreMetricLabel: {
    color: "#8EA3C7",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  scoreMetricValue: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "900",
  },
  replayList: {
    gap: 10,
  },
  replayCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    padding: 12,
    paddingLeft: 16,
    backgroundColor: "rgba(17, 24, 39, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    gap: 10,
  },
  replayAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  replayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  replayTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
  },
  replaySubtitle: {
    color: "#B8C2D9",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  turnChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(96,165,250,0.16)",
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.24)",
  },
  turnChipText: {
    color: "#BFDBFE",
    fontSize: 12,
    fontWeight: "900",
  },
  replayMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  replayMetricPill: {
    minWidth: "30%",
    flexGrow: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: "rgba(9, 15, 31, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    gap: 3,
  },
  replayMetricLabel: {
    color: "#8EA3C7",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  replayMetricValue: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "900",
  },
  assistBlock: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.12)",
    paddingTop: 10,
    gap: 8,
  },
  assistBlockLabel: {
    color: "#8EA3C7",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  assistChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  assistChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    maxWidth: "100%",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(9, 15, 31, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.16)",
  },
  assistChipDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  assistChipName: {
    flexShrink: 1,
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "800",
  },
  assistChipValue: {
    color: "#86EFAC",
    fontSize: 12,
    fontWeight: "900",
  },
  emptyInlineText: {
    color: "#B8C2D9",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  secondaryAction: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(148, 163, 184, 0.16)",
  },
  primaryAction: {
    backgroundColor: "rgba(96,165,250,0.18)",
    borderColor: "rgba(96,165,250,0.42)",
  },
  actionButtonText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "900",
  },
});
