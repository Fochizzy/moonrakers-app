import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";
import MultiLineChart from "./MultiLineChart";
import useReplayAnalytics, {
  type ReplayMetricKey,
  type ReplayPlayer,
  type ReplayPoint,
} from "./useReplayAnalytics";
import { getChartMetricValue } from "@/utils/chartMetricValue";

type SnapshotValue =
  | number
  | string
  | boolean
  | null
  | undefined
  | Record<string, unknown>;

type Props = {
  replay?: Array<{
    round?: number;
    label?: string;
    snapshot?: Record<string, SnapshotValue>;
  }>;
  players?: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
  statKey?: ReplayMetricKey;
  title?: string;
};

const COLORS = {
  card: "rgba(12,18,38,0.92)",
  cardAlt: "rgba(16,24,48,0.95)",
  text: "#E2E8F0",
  sub: "#94A3B8",
  border: "rgba(255,255,255,0.08)",
  whiteSoft: "rgba(255,255,255,0.06)",
};

function getSnapshotEntry(
  point: ReplayPoint | undefined,
  playerId: string
): unknown {
  const snapshot = point?.snapshot;
  if (!snapshot || typeof snapshot !== "object") return undefined;

  const direct = (snapshot as Record<string, unknown>)[playerId];
  if (direct != null) return direct;

  const nestedPlayers = (snapshot as Record<string, unknown>).players;
  if (
    nestedPlayers &&
    typeof nestedPlayers === "object" &&
    !Array.isArray(nestedPlayers)
  ) {
    return (nestedPlayers as Record<string, unknown>)[playerId];
  }

  return undefined;
}

function buildRounds(replay: ReplayPoint[]) {
  return replay.map((point, index) => point.label ?? `Round ${point.round ?? index + 1}`);
}

function buildSeries(
  replay: ReplayPoint[],
  players: ReplayPlayer[],
  statKey: ReplayMetricKey
) {
  return players.map((player, index) => ({
    id: player.id,
    label: player.name || "Unknown",
    color: player.color ?? ["#A855F7", "#3B82F6", "#22C55E", "#3B82F6"][index % 4],
    values: replay.map((point) =>
      getChartMetricValue(getSnapshotEntry(point, player.id), statKey)
    ),
  }));
}

function SectionHeader({
  title,
  sub,
}: {
  title: string;
  sub: string;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{sub}</Text>
    </View>
  );
}

export default function ReplayChart({
  replay = [],
  players = [],
  statKey = "totalPrestige",
  title = "Replay Chart",
}: Props) {
  const safeReplay = (Array.isArray(replay) ? replay : []) as ReplayPoint[];
  const safePlayers = (Array.isArray(players) ? players : []) as ReplayPlayer[];

  const analytics = useReplayAnalytics(safeReplay, safePlayers, statKey);
  const derivedReplay = analytics.derivedReplay;
  const summary = analytics.summary;

  const rounds = useMemo(() => buildRounds(derivedReplay), [derivedReplay]);
  const series = useMemo(
    () => buildSeries(derivedReplay, safePlayers, statKey),
    [derivedReplay, safePlayers, statKey]
  );

  const metricSeriesMap = useMemo(
    () => ({
      [statKey]: derivedReplay.map((point) => ({
        label: point.label ?? `Round ${point.round ?? 0}`,
        value: 0,
      })),
    }),
    [derivedReplay, statKey]
  );

  const insightCards = useMemo(
    () => [
      { label: "Rounds", value: String(rounds.length) },
      { label: "Players", value: String(safePlayers.length) },
      { label: "Leader", value: summary?.leadingPlayer?.name ?? "—" },
      { label: "Peak", value: summary?.peakDisplay ?? "0" },
    ],
    [rounds.length, safePlayers.length, summary]
  );

  if (!safeReplay.length || !safePlayers.length) {
    return (
      <View style={styles.sectionCompact}>
        <Text style={styles.emptyText}>Replay data is not available yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionCompact}>
        <SectionHeader title={title} sub={statKey} />
        <Text style={styles.helperText}>
          Replay progression driven by unified snapshot analytics.
        </Text>
      </View>

      <View style={styles.sectionCompact}>
        <SectionHeader title="Summary" sub={`${rounds.length} rounds`} />

        <View style={styles.metricGridDense}>
          {insightCards.map((card) => (
            <View key={card.label} style={styles.metricCardDense}>
              <Text style={styles.metricValueDense}>{card.value}</Text>
              <Text style={styles.metricLabelDense}>{card.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionCompact}>
        <MultiLineChart
          data={derivedReplay as any}
          players={safePlayers as any}
          statKey={statKey}
          title={title}
          subtitle="Replay progression"
          scopedPlayerIds={safePlayers.map((player) => player.id)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  sectionCompact: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  sectionSub: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
  },
  helperText: {
    color: COLORS.sub,
    fontSize: 12,
    lineHeight: 18,
  },
  metricGridDense: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCardDense: {
    minWidth: 72,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.cardAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricValueDense: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  metricLabelDense: {
    color: COLORS.sub,
    fontSize: 10,
    marginTop: 2,
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 12,
    fontWeight: "700",
  },
});

