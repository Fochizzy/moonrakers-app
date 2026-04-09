import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Text from "@/components/ui/Text";

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
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
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
};

type MatchupSummary = {
  playerAId: string;
  playerBId: string;
  playerAName: string;
  playerBName: string;
  playerAColor: string;
  playerBColor: string;
  games: number;
  aWins: number;
  bWins: number;
  ties: number;
  aWinRate: number;
  bWinRate: number;
  avgPrestigeMargin: number;
  avgScoreMargin: number;
  recentFive: string;
  verdict: string;
};

const COLORS = {
  card: "rgba(12,18,38,0.92)",
  text: "#E2E8F0",
  sub: "#94A3B8",
  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.18)",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.16)",
  border: "rgba(255,255,255,0.08)",
  whiteSoft: "rgba(255,255,255,0.06)",
};

function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getColor(color?: string, index = 0) {
  if (typeof color === "string" && color.trim()) return color.trim();
  const fallback = ["#A855F7", "#3B82F6", "#22C55E", "#3B82F6"];
  return fallback[index % fallback.length];
}

function totalPrestige(row?: Record<string, number>) {
  return (
    n(row?.totalPrestige) ||
    n(row?.prestige) ||
    n(row?.directPrestige) + n(row?.assistPrestigeReceived) + n(row?.objectivePrestige)
  );
}

function totalScore(row?: Record<string, number>) {
  return n(row?.score) || totalPrestige(row);
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function buildVerdict(aName: string, bName: string, aRate: number, margin: number) {
  if (Math.abs(aRate - 0.5) < 0.08) {
    return `${aName} and ${bName} are effectively even over the current sample.`;
  }
  const leader = aRate >= 0.5 ? aName : bName;
  return `${leader} has the stronger long-run edge, with prestige margin ${signed(margin)}.`;
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

function buildSummary(
  players: Player[],
  data: SnapshotPoint[],
  aId?: string | null,
  bId?: string | null
): MatchupSummary | null {
  if (players.length < 2) return null;

  const playerA = players.find((p) => String(p.id) === String(aId)) ?? players[0];
  const playerB =
    players.find(
      (p) => String(p.id) === String(bId) && String(p.id) !== String(playerA.id)
    ) ?? players.find((p) => String(p.id) !== String(playerA.id));

  if (!playerA || !playerB) return null;

  let games = 0;
  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  let prestigeMargin = 0;
  let scoreMargin = 0;
  const history: string[] = [];

  for (const point of data || []) {
    const a = point?.snapshot?.[playerA.id];
    const b = point?.snapshot?.[playerB.id];
    if (!a || !b) continue;

    games += 1;

    const aPrestige = totalPrestige(a);
    const bPrestige = totalPrestige(b);
    const aScore = totalScore(a);
    const bScore = totalScore(b);

    prestigeMargin += aPrestige - bPrestige;
    scoreMargin += aScore - bScore;

    if (aPrestige > bPrestige) {
      aWins += 1;
      history.push("A");
    } else if (bPrestige > aPrestige) {
      bWins += 1;
      history.push("B");
    } else {
      ties += 1;
      history.push("T");
    }
  }

  if (!games) return null;

  const aWinRate = aWins / games;
  const bWinRate = bWins / games;

  return {
    playerAId: playerA.id,
    playerBId: playerB.id,
    playerAName: playerA.name || "Player A",
    playerBName: playerB.name || "Player B",
    playerAColor: getColor(playerA.color, 0),
    playerBColor: getColor(playerB.color, 1),
    games,
    aWins,
    bWins,
    ties,
    aWinRate,
    bWinRate,
    avgPrestigeMargin: prestigeMargin / games,
    avgScoreMargin: scoreMargin / games,
    recentFive: history.slice(-5).join(" "),
    verdict: buildVerdict(
      playerA.name || "Player A",
      playerB.name || "Player B",
      aWinRate,
      prestigeMargin / games
    ),
  };
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

  const [selectedA, setSelectedA] = useState<string | null>(playerId);
  const [selectedB, setSelectedB] = useState<string | null>(compareId);

  useEffect(() => {
    if (!selectedA && visiblePlayers.length) {
      setSelectedA(String(visiblePlayers[0].id));
    }

    if ((!selectedB || selectedB === selectedA) && visiblePlayers.length > 1) {
      const fallback = visiblePlayers.find(
        (p) => String(p.id) !== String(selectedA ?? visiblePlayers[0].id)
      );
      setSelectedB(fallback ? String(fallback.id) : null);
    }
  }, [visiblePlayers, selectedA, selectedB]);

  useEffect(() => {
    if (playerId) setSelectedA(playerId);
  }, [playerId]);

  useEffect(() => {
    if (compareId) setSelectedB(compareId);
  }, [compareId]);

  const summary = useMemo(
    () => buildSummary(visiblePlayers, effectiveData, selectedA, selectedB),
    [visiblePlayers, effectiveData, selectedA, selectedB]
  );

  if (!summary) {
    return (
      <View style={styles.sectionCompact}>
        <Text style={styles.emptyTitle}>No head-to-head data yet</Text>
        <Text style={styles.emptyText}>
          Pick two players with shared saved or imported game history to render this matchup.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionCompact}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSub}>{summary.games} games</Text>
        </View>

        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.selectorBlock}>
          <Text style={styles.selectorLabel}>Player A</Text>
          <View style={styles.selectorList}>
            {visiblePlayers.map((player, index) => (
              <TouchableOpacity
                key={`a-${player.id}`}
                style={[
                  styles.playerChip,
                  String(player.id) === String(selectedA) && {
                    borderColor: getColor(player.color, index),
                    backgroundColor: `${getColor(player.color, index)}22`,
                  },
                ]}
                onPress={() =>
                  String(player.id) !== String(selectedB) && setSelectedA(String(player.id))
                }
                activeOpacity={0.9}
              >
                <View
                  style={[styles.playerDot, { backgroundColor: getColor(player.color, index) }]}
                />
                <Text style={styles.playerChipText}>{player.name || "Unknown"}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.selectorBlock}>
          <Text style={styles.selectorLabel}>Player B</Text>
          <View style={styles.selectorList}>
            {visiblePlayers.map((player, index) => (
              <TouchableOpacity
                key={`b-${player.id}`}
                style={[
                  styles.playerChip,
                  String(player.id) === String(selectedB) && {
                    borderColor: getColor(player.color, index),
                    backgroundColor: `${getColor(player.color, index)}22`,
                  },
                ]}
                onPress={() =>
                  String(player.id) !== String(selectedA) && setSelectedB(String(player.id))
                }
                activeOpacity={0.9}
              >
                <View
                  style={[styles.playerDot, { backgroundColor: getColor(player.color, index) }]}
                />
                <Text style={styles.playerChipText}>{player.name || "Unknown"}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.sectionCompact}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {summary.playerAName} vs {summary.playerBName}
          </Text>
          <Text style={styles.sectionSub}>
            {pct(summary.aWinRate)} / {pct(summary.bWinRate)}
          </Text>
        </View>

        <View style={styles.metricGridDense}>
          <View style={[styles.metricCardDense, { backgroundColor: COLORS.blueSoft }]}>
            <Text style={styles.metricLabelCompact}>{summary.playerAName}</Text>
            <Text style={[styles.metricValueCompact, { color: COLORS.blue }]}>
              {summary.aWins}
            </Text>
          </View>

          <View style={styles.metricCardDense}>
            <Text style={styles.metricLabelCompact}>Games</Text>
            <Text style={styles.metricValueCompact}>{summary.games}</Text>
          </View>

          <View style={[styles.metricCardDense, { backgroundColor: COLORS.greenSoft }]}>
            <Text style={styles.metricLabelCompact}>{summary.playerBName}</Text>
            <Text style={[styles.metricValueCompact, { color: COLORS.green }]}>
              {summary.bWins}
            </Text>
          </View>

          <View style={styles.metricCardDense}>
            <Text style={styles.metricLabelCompact}>Prestige Δ</Text>
            <Text style={styles.metricValueCompact}>{signed(summary.avgPrestigeMargin)}</Text>
          </View>

          <View style={styles.metricCardDense}>
            <Text style={styles.metricLabelCompact}>Score Δ</Text>
            <Text style={styles.metricValueCompact}>{signed(summary.avgScoreMargin)}</Text>
          </View>

          <View style={styles.metricCardDense}>
            <Text style={styles.metricLabelCompact}>Recent 5</Text>
            <Text style={styles.metricValueCompact}>{summary.recentFive || "—"}</Text>
          </View>
        </View>

        <View style={styles.barWrap}>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barLeft,
                { width: `${summary.aWinRate * 50}%`, backgroundColor: summary.playerAColor },
              ]}
            />
            <View
              style={[
                styles.barRight,
                { width: `${summary.bWinRate * 50}%`, backgroundColor: summary.playerBColor },
              ]}
            />
            <View style={styles.barCenter} />
          </View>

          <View style={styles.barLabels}>
            <Text style={styles.barLabel}>{summary.aWins} wins</Text>
            <Text style={styles.barLabel}>{summary.ties} ties</Text>
            <Text style={styles.barLabel}>{summary.bWins} wins</Text>
          </View>
        </View>

        <Text style={styles.verdict}>{summary.verdict}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  sectionCompact: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 6,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
  },
  sectionSub: {
    color: COLORS.sub,
    fontSize: 10,
    textAlign: "right",
    flexShrink: 1,
  },
  subtitle: {
    color: COLORS.sub,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 11,
  },
  selectorBlock: {
    gap: 6,
    marginTop: 6,
  },
  selectorLabel: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
  },
  selectorList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  playerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  playerDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  playerChipText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "700",
  },
  metricGridDense: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  metricCardDense: {
    minWidth: "30%",
    flexGrow: 1,
    borderRadius: 12,
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  metricLabelCompact: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
  },
  metricValueCompact: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4,
  },
  barWrap: {
    marginTop: 10,
    gap: 6,
  },
  barTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: COLORS.whiteSoft,
    overflow: "hidden",
    position: "relative",
    flexDirection: "row",
  },
  barLeft: {
    height: "100%",
  },
  barRight: {
    height: "100%",
    marginLeft: "auto",
  },
  barCenter: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: COLORS.border,
  },
  barLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  barLabel: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "700",
  },
  verdict: {
    marginTop: 8,
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 16,
  },
});
